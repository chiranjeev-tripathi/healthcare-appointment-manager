import { Router, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import prisma from '../config/database';
import { AuthRequest, AppError, ValidationError } from '../types';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { Role, AppointmentStatus, NotificationStatus } from '@prisma/client';

const router = Router();

// Apply auth middleware to all admin routes
router.use(authenticate);
router.use(authorize(Role.ADMIN));

router.get('/appointments', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const { status, doctorId, startDate, endDate } = req.query;

    const whereClause: any = {};

    if (status && Object.values(AppointmentStatus).includes(status as AppointmentStatus)) {
      whereClause.status = status;
    }

    if (doctorId) {
      whereClause.doctorId = doctorId;
    }

    if (startDate || endDate) {
      whereClause.slotStart = {};
      if (startDate) {
        whereClause.slotStart.gte = new Date(startDate as string);
      }
      if (endDate) {
        whereClause.slotStart.lte = new Date(endDate as string);
      }
    }

    const [appointments, total] = await Promise.all([
      prisma.appointment.findMany({
        where: whereClause,
        skip,
        take: limit,
        include: {
          patient: { select: { id: true, name: true, email: true } },
          doctor: { select: { id: true, name: true, email: true } }
        },
        orderBy: { slotStart: 'desc' }
      }),
      prisma.appointment.count({ where: whereClause })
    ]);

    res.json({
      success: true,
      data: appointments,
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

router.get('/system-health', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const [
      appointmentsByStatus,
      failedNotifications,
      deadLetterNotifications,
      pendingRetries
    ] = await Promise.all([
      prisma.appointment.groupBy({
        by: ['status'],
        _count: { id: true }
      }),
      prisma.notificationLog.count({
        where: { status: NotificationStatus.FAILED }
      }),
      prisma.notificationLog.count({
        where: { status: NotificationStatus.DEAD_LETTER }
      }),
      prisma.notificationLog.count({
        where: {
          status: NotificationStatus.PENDING,
          retryCount: { gt: 0 }
        }
      })
    ]);

    const appointmentStats = appointmentsByStatus.reduce((acc, curr) => {
      acc[curr.status] = curr._count.id;
      return acc;
    }, {} as Record<string, number>);

    res.json({
      success: true,
      data: {
        appointments: appointmentStats,
        notifications: {
          failed: failedNotifications,
          deadLetter: deadLetterNotifications,
          pendingRetries: pendingRetries
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

const CreateDoctorSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  specialisation: z.string().min(1, 'Specialisation is required'),
  workingHours: z.record(
    z.object({
      start: z.string(),
      end: z.string()
    })
  ),
  slotDurationMinutes: z.number().min(5).max(120).default(30)
});

router.post('/doctors', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const parseResult = CreateDoctorSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw new ValidationError(parseResult.error.errors[0].message);
    }

    const { name, email, password, specialisation, workingHours, slotDurationMinutes } = parseResult.data;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new AppError('User with this email already exists', 400);
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const doctor = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name,
          email,
          passwordHash,
          role: Role.DOCTOR,
          doctorProfile: {
            create: {
              specialisation,
              workingHours,
              slotDurationMinutes
            }
          }
        },
        include: {
          doctorProfile: true
        }
      });
      return user;
    });

    const { passwordHash: _, ...doctorWithoutPassword } = doctor;

    res.status(201).json({
      success: true,
      data: doctorWithoutPassword
    });
  } catch (error) {
    next(error);
  }
});

export default router;
