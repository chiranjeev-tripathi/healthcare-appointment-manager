import prisma from '../config/database';
import { sendEmail, bookingConfirmationTemplate, bookingReminderTemplate, cancellationTemplate, medicationReminderTemplate } from './email.service';
import { calendarService } from './calendar.service';
import { NotificationType } from '@prisma/client';

/**
 * Notification orchestrator.
 * All functions catch errors internally and NEVER throw.
 * Failures are logged to notification_logs for retry by the background worker.
 */

export async function sendBookingConfirmation(appointmentId: string): Promise<void> {
  try {
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        patient: true,
        doctor: {
          include: { doctorProfile: true },
        },
      },
    });

    if (!appointment) return;

    const dateStr = appointment.slotStart.toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    // Send email
    const html = bookingConfirmationTemplate(
      appointment.patient.name,
      appointment.doctor.name,
      dateStr,
      appointment.id
    );

    await sendEmail({
      to: appointment.patient.email,
      subject: `Appointment Confirmed — ${dateStr}`,
      html,
    });

    // Create calendar event (if doctor has calendar connected)
    try {
      const eventId = await calendarService.createEvent({
        doctorId: appointment.doctorId,
        summary: `Appointment with ${appointment.patient.name}`,
        description: `Patient: ${appointment.patient.name}\nEmail: ${appointment.patient.email}\nAppointment ID: ${appointmentId}`,
        startTime: appointment.slotStart,
        endTime: appointment.slotEnd,
        attendeeEmail: appointment.patient.email,
      });

      if (eventId) {
        await prisma.appointment.update({
          where: { id: appointmentId },
          data: { calendarEventId: eventId },
        });
      }
    } catch (calError) {
      console.error('[Notification] Calendar event creation failed:', calError);
      // Log calendar failure for retry
      await logNotificationFailure(
        NotificationType.CALENDAR,
        appointment.patient.email,
        'Calendar Event — Booking Confirmation',
        { appointmentId, action: 'create' },
        calError
      );
    }
  } catch (error) {
    console.error('[Notification] sendBookingConfirmation failed:', error);
  }
}

export async function sendBookingReminder(appointmentId: string): Promise<void> {
  try {
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: { patient: true, doctor: true },
    });

    if (!appointment) return;

    const dateStr = appointment.slotStart.toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const html = bookingReminderTemplate(
      appointment.patient.name,
      appointment.doctor.name,
      dateStr
    );

    await sendEmail({
      to: appointment.patient.email,
      subject: `Appointment Reminder — Tomorrow with ${appointment.doctor.name}`,
      html,
    });
  } catch (error) {
    console.error('[Notification] sendBookingReminder failed:', error);
  }
}

export async function sendCancellationNotice(appointmentId: string, reason?: string): Promise<void> {
  try {
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: { patient: true, doctor: true },
    });

    if (!appointment) return;

    const dateStr = appointment.slotStart.toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const html = cancellationTemplate(
      appointment.patient.name,
      appointment.doctor.name,
      dateStr,
      reason
    );

    await sendEmail({
      to: appointment.patient.email,
      subject: `Appointment Cancelled — ${dateStr}`,
      html,
    });

    // Delete calendar event if exists
    if (appointment.calendarEventId) {
      try {
        await calendarService.deleteEvent(appointment.doctorId, appointment.calendarEventId);
      } catch (calError) {
        console.error('[Notification] Calendar event deletion failed:', calError);
        await logNotificationFailure(
          NotificationType.CALENDAR,
          appointment.patient.email,
          'Calendar Event — Cancellation',
          { appointmentId, eventId: appointment.calendarEventId, action: 'delete' },
          calError
        );
      }
    }
  } catch (error) {
    console.error('[Notification] sendCancellationNotice failed:', error);
  }
}

export async function sendMedicationReminderNotification(reminderId: string): Promise<void> {
  try {
    const reminder = await prisma.medicationReminder.findUnique({
      where: { id: reminderId },
      include: { patient: true },
    });

    if (!reminder) return;

    const html = medicationReminderTemplate(
      reminder.patient.name,
      reminder.medication,
      reminder.dosage,
      `Take ${reminder.dosage} ${reminder.frequency.replace('_', ' ')}`
    );

    await sendEmail({
      to: reminder.patient.email,
      subject: `Medication Reminder — ${reminder.medication}`,
      html,
    });
  } catch (error) {
    console.error('[Notification] sendMedicationReminder failed:', error);
  }
}

// ─── Helpers ─────────────────────────────────────────────

async function logNotificationFailure(
  type: NotificationType,
  recipientEmail: string,
  subject: string,
  payload: any,
  error: unknown
): Promise<void> {
  try {
    const backoffMs = 2 * 60 * 1000; // First retry in 2 minutes
    await prisma.notificationLog.create({
      data: {
        type,
        recipientEmail,
        subject,
        status: 'FAILED',
        retryCount: 0,
        maxRetries: 5,
        nextRetryAt: new Date(Date.now() + backoffMs),
        payload,
        errorMessage: error instanceof Error ? error.message : String(error),
      },
    });
  } catch (logError) {
    console.error('[Notification] Failed to log notification failure:', logError);
  }
}
