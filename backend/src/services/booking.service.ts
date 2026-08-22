import prisma from '../config/database';
import { config } from '../config';
import { HoldSlotInput, ConfirmBookingInput, SlotUnavailableError, NotFoundError, ValidationError, AppError } from '../types';
import { AppointmentStatus, Prisma, Role, Appointment } from '@prisma/client';
import { generateAndSavePreVisitSummary } from './llm';
import { sendBookingConfirmation, sendCancellationNotice } from './notification.service';

export async function holdSlot(input: HoldSlotInput): Promise<Appointment> {
    const slotStart = new Date(input.slotStart);
    if (slotStart <= new Date()) {
        throw new ValidationError('slotStart must be in the future');
    }

    try {
        return await prisma.$transaction(async (tx) => {
            // Check if doctor has a leave on that date
            const dateStr = slotStart.toISOString().split('T')[0];
            const leaves = await tx.$queryRaw<any[]>`
                SELECT * FROM doctor_leaves 
                WHERE doctor_id = ${input.doctorId} AND date = ${dateStr}::date
            `;
            if (leaves.length > 0) {
                throw new SlotUnavailableError('Doctor is on leave on this date');
            }

            // Lock check
            const existingAppointments = await tx.$queryRaw<any[]>`
                SELECT * FROM appointments 
                WHERE doctor_id = ${input.doctorId} AND slot_start = ${slotStart} AND status IN ('HELD', 'BOOKED') 
                FOR UPDATE
            `;
            if (existingAppointments.length > 0) {
                throw new SlotUnavailableError('Slot is already held or booked');
            }

            const doctorProfile = await tx.doctorProfile.findUnique({
                where: { userId: input.doctorId }
            });
            if (!doctorProfile) {
                throw new NotFoundError('Doctor not found');
            }

            const slotEnd = new Date(slotStart.getTime() + doctorProfile.slotDurationMinutes * 60000);
            // Default 15 minutes hold if config is undefined
            const holdMinutes = config?.slotHoldMinutes || 15;
            const heldUntil = new Date(Date.now() + holdMinutes * 60000);

            const newAppointment = await tx.appointment.create({
                data: {
                    doctorId: input.doctorId,
                    patientId: input.patientId,
                    slotStart: slotStart,
                    slotEnd: slotEnd,
                    status: AppointmentStatus.HELD,
                    heldUntil: heldUntil
                }
            });

            return newAppointment;
        }, {
            isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
            timeout: 10000
        });
    } catch (error: any) {
        if (error instanceof SlotUnavailableError || error instanceof NotFoundError || error instanceof ValidationError) {
            throw error;
        }
        if (error.code === 'P2002' || error.code === 'P2034') { 
            throw new SlotUnavailableError('Slot is already taken or conflict occurred');
        }
        throw error;
    }
}

export async function confirmBooking(input: ConfirmBookingInput): Promise<{ appointment: Appointment, symptomForm: any }> {
    const result = await prisma.$transaction(async (tx) => {
        const rows = await tx.$queryRaw<any[]>`
            SELECT * FROM appointments WHERE id = ${input.appointmentId} FOR UPDATE
        `;
        if (rows.length === 0) {
            throw new NotFoundError('Appointment not found');
        }

        const apt = rows[0];
        
        // Prisma queryRaw returns column names as defined in DB, checking both just in case
        const aptStatus = apt.status;
        const patientId = apt.patient_id || apt.patientId;
        const heldUntil = apt.held_until || apt.heldUntil;

        if (aptStatus !== AppointmentStatus.HELD) {
            throw new AppError('Booking cannot be confirmed', 400);
        }

        if (patientId !== input.patientId) {
            throw new AppError('Unauthorized', 403);
        }

        if (heldUntil && heldUntil < new Date()) {
            await tx.appointment.update({
                where: { id: input.appointmentId },
                data: { status: AppointmentStatus.CANCELLED }
            });
            throw new SlotUnavailableError('Hold expired');
        }

        const appointment = await tx.appointment.update({
            where: { id: input.appointmentId },
            data: {
                status: AppointmentStatus.BOOKED,
                heldUntil: null
            }
        });

        const symptomForm = await tx.symptomForm.create({
            data: {
                appointmentId: input.appointmentId,
                rawSymptoms: input.symptoms
            }
        });

        return { appointment, symptomForm };
    }, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        timeout: 10000
    });

    // Fire and forget
    generateAndSavePreVisitSummary(input.appointmentId).catch(console.error);
    sendBookingConfirmation(input.appointmentId).catch(console.error);

    return result;
}

export async function cancelBooking(appointmentId: string, userId: string, userRole: Role): Promise<Appointment> {
    const result = await prisma.$transaction(async (tx) => {
        const rows = await tx.$queryRaw<any[]>`
            SELECT * FROM appointments WHERE id = ${appointmentId} FOR UPDATE
        `;
        if (rows.length === 0) {
            throw new NotFoundError('Appointment not found');
        }

        const apt = rows[0];
        const patientId = apt.patient_id || apt.patientId;
        const doctorId = apt.doctor_id || apt.doctorId;

        if (userRole === Role.PATIENT && patientId !== userId) {
            throw new AppError('Unauthorized', 403);
        }
        if (userRole === Role.DOCTOR && doctorId !== userId) {
            throw new AppError('Unauthorized', 403);
        }

        if (apt.status !== AppointmentStatus.HELD && apt.status !== AppointmentStatus.BOOKED) {
            throw new AppError('Can only cancel HELD or BOOKED appointments', 400);
        }

        const updated = await tx.appointment.update({
            where: { id: appointmentId },
            data: { status: AppointmentStatus.CANCELLED }
        });

        return updated;
    }, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        timeout: 10000
    });

    // Fire and forget
    sendCancellationNotice(appointmentId).catch(console.error);

    return result;
}

export async function completeAppointment(appointmentId: string, doctorId: string): Promise<Appointment> {
    return await prisma.$transaction(async (tx) => {
        const rows = await tx.$queryRaw<any[]>`
            SELECT * FROM appointments WHERE id = ${appointmentId} FOR UPDATE
        `;
        if (rows.length === 0) {
            throw new NotFoundError('Appointment not found');
        }
        const apt = rows[0];
        const aptDoctorId = apt.doctor_id || apt.doctorId;

        if (aptDoctorId !== doctorId) {
            throw new AppError('Unauthorized', 403);
        }
        if (apt.status !== AppointmentStatus.BOOKED) {
            throw new AppError('Only BOOKED appointments can be completed', 400);
        }

        return tx.appointment.update({
            where: { id: appointmentId },
            data: { status: AppointmentStatus.COMPLETED }
        });
    }, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        timeout: 10000
    });
}
