import { Request } from 'express';
import { z } from 'zod';
import { Role } from '@prisma/client';

// ─── Express Extensions ──────────────────────────────────

export interface AuthUser {
  id: string;
  email: string;
  role: Role;
  name: string;
}

export interface AuthRequest extends Request {
  user?: AuthUser;
}

// ─── API Response Types ──────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ─── LLM Schemas (Zod) ──────────────────────────────────

export const PreVisitSummarySchema = z.object({
  urgency_level: z.enum(['Low', 'Medium', 'High']),
  chief_complaint: z.string(),
  suggested_questions: z.tuple([z.string(), z.string(), z.string()]),
});

export type PreVisitSummary = z.infer<typeof PreVisitSummarySchema>;

export const MedicationItemSchema = z.object({
  medication: z.string(),
  dosage: z.string(),
  frequency: z.string(),
  duration: z.string(),
  instructions: z.string(),
});

export const PostVisitSummarySchema = z.object({
  summary: z.string(),
  medication_schedule: z.array(MedicationItemSchema),
  follow_up_steps: z.array(z.string()),
});

export type PostVisitSummary = z.infer<typeof PostVisitSummarySchema>;
export type MedicationItem = z.infer<typeof MedicationItemSchema>;

// ─── Working Hours Type ──────────────────────────────────

export interface DaySchedule {
  start: string; // "HH:MM" 24-hour format
  end: string;
}

export type WorkingHours = {
  [key in 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday']?: DaySchedule;
};

// ─── Slot Types ──────────────────────────────────────────

export interface TimeSlot {
  start: string; // ISO DateTime
  end: string;   // ISO DateTime
  available: boolean;
}

// ─── Booking Types ───────────────────────────────────────

export interface HoldSlotInput {
  patientId: string;
  doctorId: string;
  slotStart: Date;
}

export interface ConfirmBookingInput {
  appointmentId: string;
  patientId: string;
  symptoms: string;
}

// ─── Notification Types ──────────────────────────────────

export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  icsContent?: string;
}

export interface CalendarEventPayload {
  doctorId: string;
  summary: string;
  description: string;
  startTime: Date;
  endTime: Date;
  attendeeEmail?: string;
}

// ─── Error Classes ───────────────────────────────────────

export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public code?: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class SlotUnavailableError extends AppError {
  constructor(message = 'This slot is no longer available. Please choose another time.') {
    super(message, 409, 'SLOT_UNAVAILABLE');
    this.name = 'SlotUnavailableError';
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 401, 'UNAUTHORIZED');
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Insufficient permissions') {
    super(message, 403, 'FORBIDDEN');
    this.name = 'ForbiddenError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
  }
}
