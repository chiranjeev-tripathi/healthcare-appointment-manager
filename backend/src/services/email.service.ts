import nodemailer from 'nodemailer';
import { config } from '../config';
import { prisma } from '../config/database';

export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  referenceId?: string; // appointmentId or reminderId
  type?: string;
}

export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport(config.smtp);
  }

  async sendEmail(payload: EmailPayload): Promise<void> {
    let logId: string | undefined;

    try {
      const log = await prisma.notification_logs.create({
        data: {
          type: payload.type || 'email',
          target: payload.to,
          content: payload.html,
          reference_id: payload.referenceId,
          status: 'PENDING',
        },
      });
      logId = log.id;

      await this.transporter.sendMail({
        from: config.smtp.from,
        to: payload.to,
        subject: payload.subject,
        html: payload.html,
      });

      await prisma.notification_logs.update({
        where: { id: logId },
        data: { status: 'SENT' },
      });
    } catch (error) {
      console.error('Failed to send email:', error);
      
      if (logId) {
        const retryCount = 0;
        const nextRetry = new Date(Date.now() + 2 * 60 * 1000); // 2 minutes

        await prisma.notification_logs.update({
          where: { id: logId },
          data: {
            status: 'FAILED',
            retry_count: retryCount,
            next_retry_at: nextRetry,
            error_message: error instanceof Error ? error.message : String(error),
          },
        });
      }
    }
  }

  bookingConfirmationTemplate(patientName: string, doctorName: string, dateTime: string, appointmentId: string): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <h2 style="color: #2c3e50;">Booking Confirmation</h2>
        <p>Dear ${patientName},</p>
        <p>Your appointment has been successfully confirmed.</p>
        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Doctor:</strong> ${doctorName}</p>
          <p><strong>Date & Time:</strong> ${dateTime}</p>
          <p><strong>Appointment ID:</strong> ${appointmentId}</p>
        </div>
        <p>Please complete any pre-visit forms if required.</p>
        <p>Best regards,<br>Healthcare Appointment Manager</p>
      </div>
    `;
  }

  bookingReminderTemplate(patientName: string, doctorName: string, dateTime: string): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <h2 style="color: #2c3e50;">Appointment Reminder</h2>
        <p>Dear ${patientName},</p>
        <p>This is a reminder for your upcoming appointment in 24 hours.</p>
        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Doctor:</strong> ${doctorName}</p>
          <p><strong>Date & Time:</strong> ${dateTime}</p>
        </div>
        <p>Best regards,<br>Healthcare Appointment Manager</p>
      </div>
    `;
  }

  cancellationTemplate(patientName: string, doctorName: string, dateTime: string, reason?: string): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <h2 style="color: #e74c3c;">Appointment Cancelled</h2>
        <p>Dear ${patientName},</p>
        <p>Your appointment has been cancelled.</p>
        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Doctor:</strong> ${doctorName}</p>
          <p><strong>Date & Time:</strong> ${dateTime}</p>
          ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
        </div>
        <p>Best regards,<br>Healthcare Appointment Manager</p>
      </div>
    `;
  }

  medicationReminderTemplate(patientName: string, medication: string, dosage: string, instructions: string): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <h2 style="color: #3498db;">Medication Reminder</h2>
        <p>Dear ${patientName},</p>
        <p>It is time to take your medication.</p>
        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Medication:</strong> ${medication}</p>
          <p><strong>Dosage:</strong> ${dosage}</p>
          <p><strong>Instructions:</strong> ${instructions}</p>
        </div>
        <p>Stay healthy!<br>Healthcare Appointment Manager</p>
      </div>
    `;
  }
}

export const emailService = new EmailService();
