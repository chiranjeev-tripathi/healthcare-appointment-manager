import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../config/database';
import { AuthRequest, ApiResponse, AppError, ValidationError } from '../types';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { Role, AppointmentStatus, NotificationType } from '@prisma/client';
import { SlotGeneratorService } from '../services/slot-generator.service';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const specialisation = req.query.specialisation as string;

    const skip = (page - 1) * limit;

    const whereClause: any = {
      role: Role.DOCTOR
    };

    if (specialisation) {
      whereClause.doctorProfile = {
        specialisation: {
          contains: specialisation,
          mode: 'insensitive'
        }
      };
    }

    const [doctors, total] = await Promise.all([
      prisma.user.findMany({
        where: whereClause,
        skip,
        take: limit,
        select: {
          id: true,
          name: true,
          email: true,
          doctorProfile: true
        }
      }),
      prisma.user.count({ where: whereClause })
    ]);

    res.json({
      success: true,
      data: doctors,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const doctor = await prisma.user.findFirst({
      where: {
        id,
        role: Role.DOCTOR
      },
      select: {
        id: true,
        name: true,
        email: true,
        doctorProfile: true
      }
    });

    if (!doctor) {
      throw new AppError('Doctor not found', 404);
    }

    res.json({
      success: true,
      data: doctor
    });
  } catch (error) {
    next(error);
  }
});

router.get('/:id/slots', async (req, res, next) => {
  try {
    const { id } = req.params;
    const dateStr = req.query.date as string;

    if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      throw new ValidationError('Valid date query parameter in YYYY-MM-DD format is required');
    }

    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      throw new ValidationError('Invalid date');
    }

    const doctorProfile = await prisma.doctorProfile.findUnique({
      where: { userId: id }
    });

    if (!doctorProfile) {
      throw new AppError('Doctor profile not found', 404);
    }

    const slots = await SlotGeneratorService.generateAvailableSlots(
      id,
      date,
      doctorProfile.workingHours as any,
      doctorProfile.slotDurationMinutes
    );

    res.json({
      success: true,
      data: slots
    });
  } catch (error) {
    next(error);
  }
});

const UpdateProfileSchema = z.object({
  specialisation: z.string().optional(),
  workingHours: z.record(
    z.object({
      start: z.string(),
      end: z.string()
    })
  ).optional(),
  slotDurationMinutes: z.number().min(5).max(120).optional()
});

router.put('/:id/profile', authenticate, authorize(Role.DOCTOR, Role.ADMIN), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    if (req.user!.role === Role.DOCTOR && req.user!.id !== id) {
      throw new AppError('Cannot update another doctor profile', 403);
    }

    const parseResult = UpdateProfileSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw new ValidationError('Invalid input data');
    }

    const updateData = parseResult.data;

    const updatedProfile = await prisma.doctorProfile.update({
      where: { userId: id },
      data: updateData
    });

    res.json({
      success: true,
      data: updatedProfile
    });
  } catch (error) {
    next(error);
  }
});

const AddLeaveSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  reason: z.string().optional()
});

router.post('/:id/leave', authenticate, authorize(Role.DOCTOR, Role.ADMIN), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    if (req.user!.role === Role.DOCTOR && req.user!.id !== id) {
      throw new AppError('Cannot add leave for another doctor', 403);
    }

    const parseResult = AddLeaveSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw new ValidationError('Invalid input data');
    }

    const leaveDate = new Date(parseResult.data.date);
    leaveDate.setUTCHours(0,0,0,0);
    const startOfDay = new Date(leaveDate);
    const endOfDay = new Date(leaveDate);
    endOfDay.setUTCHours(23,59,59,999);

    const result = await prisma.$transaction(async (tx) => {
      // Create leave
      const leave = await tx.doctorLeave.create({
        data: {
          doctorId: id,
          date: startOfDay,
          reason: parseResult.data.reason
        }
      });

      // Find existing appointments
      const affectedAppointments = await tx.appointment.findMany({
        where: {
          doctorId: id,
          status: { in: [AppointmentStatus.BOOKED, AppointmentStatus.HELD] },
          slotStart: {
            gte: startOfDay,
            lte: endOfDay
          }
        },
        include: { patient: true }
      });

      if (affectedAppointments.length > 0) {
        // Cancel appointments
        await tx.appointment.updateMany({
          where: {
            id: { in: affectedAppointments.map(a => a.id) }
          },
          data: { status: AppointmentStatus.CANCELLED }
        });

        // Log notification entries
        const notifications = affectedAppointments.map(app => ({
          type: NotificationType.EMAIL,
          recipientEmail: app.patient.email,
          subject: 'Appointment Cancelled',
          payload: {
            message: 'Your appointment has been cancelled due to doctor unavailability.',
            appointmentId: app.id
          }
        }));

        if (notifications.length > 0) {
          await tx.notificationLog.createMany({
            data: notifications
          });
        }
      }

      return leave;
    });

    res.status(201).json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
});

router.delete('/:id/leave/:leaveId', authenticate, authorize(Role.DOCTOR, Role.ADMIN), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id, leaveId } = req.params;

    if (req.user!.role === Role.DOCTOR && req.user!.id !== id) {
      throw new AppError('Cannot remove leave for another doctor', 403);
    }

    await prisma.doctorLeave.delete({
      where: {
        id: leaveId,
        doctorId: id
      }
    });

    res.json({
      success: true,
      message: 'Leave removed successfully'
    });
  } catch (error) {
    next(error);
  }
});

router.get('/:id/leave', authenticate, authorize(Role.DOCTOR, Role.ADMIN), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    if (req.user!.role === Role.DOCTOR && req.user!.id !== id) {
      throw new AppError('Cannot view leaves for another doctor', 403);
    }

    const leaves = await prisma.doctorLeave.findMany({
      where: { doctorId: id },
      orderBy: { date: 'asc' }
    });

    res.json({
      success: true,
      data: leaves
    });
  } catch (error) {
    next(error);
  }
});

export default router;
