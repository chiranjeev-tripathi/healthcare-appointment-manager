export type Role = 'PATIENT' | 'DOCTOR' | 'ADMIN';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface AuthUser extends User {
  token: string;
}

export interface DoctorProfile {
  id: string;
  userId: string;
  user?: User;
  specialisation: string;
  qualifications: string[];
  experienceYears: number;
  bio?: string;
  workingHours: Record<string, { start: string; end: string; isWorking: boolean }>;
}

export interface DoctorLeave {
  id: string;
  doctorId: string;
  date: string;
  reason?: string;
}

export type AppointmentStatus = 'HELD' | 'BOOKED' | 'COMPLETED' | 'CANCELLED';
export type UrgencyLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export interface SymptomForm {
  chiefComplaint: string;
  duration: string;
  severity: number;
  additionalNotes?: string;
}

export interface PreVisitSummary {
  summary: string;
  urgencyLevel: UrgencyLevel;
  suggestedQuestions: string[];
}

export interface PostVisitSummary {
  summary: string;
  medicationSchedule: Array<{
    name: string;
    dosage: string;
    frequency: string;
    duration: string;
  }>;
  followUpSteps: string[];
}

export interface Appointment {
  id: string;
  patientId: string;
  patient?: User;
  doctorId: string;
  doctor?: DoctorProfile;
  date: string;
  timeSlot: string;
  status: AppointmentStatus;
  symptomForm?: SymptomForm;
  preVisitSummary?: PreVisitSummary;
  postVisitSummary?: PostVisitSummary;
  notes?: VisitNotes;
}

export interface VisitNotes {
  clinicalNotes: string;
  prescription: string;
}

export interface TimeSlot {
  time: string;
  isAvailable: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}
