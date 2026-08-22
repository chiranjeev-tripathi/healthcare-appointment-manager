-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "Role" AS ENUM ('PATIENT', 'DOCTOR', 'ADMIN');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "AppointmentStatus" AS ENUM ('HELD', 'BOOKED', 'COMPLETED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "UrgencyLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "NotificationType" AS ENUM ('EMAIL', 'CALENDAR');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "NotificationStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'DEAD_LETTER');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "ReminderStatus" AS ENUM ('ACTIVE', 'PAUSED', 'COMPLETED');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- CreateTable users
CREATE TABLE IF NOT EXISTS "users" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "role" "Role" NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "refresh_token" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "users_email_key" ON "users"("email");

-- CreateTable doctor_profiles
CREATE TABLE IF NOT EXISTS "doctor_profiles" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "user_id" TEXT NOT NULL,
    "specialisation" TEXT NOT NULL,
    "working_hours" JSONB NOT NULL,
    "slot_duration_minutes" INTEGER NOT NULL DEFAULT 30,
    "calendar_access_token" TEXT,
    "calendar_refresh_token" TEXT,
    "calendar_token_expiry" TIMESTAMP(3),
    CONSTRAINT "doctor_profiles_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "doctor_profiles_user_id_key" ON "doctor_profiles"("user_id");

-- CreateTable doctor_leaves
CREATE TABLE IF NOT EXISTS "doctor_leaves" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "doctor_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "reason" TEXT,
    CONSTRAINT "doctor_leaves_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "doctor_leaves_doctor_id_date_key" ON "doctor_leaves"("doctor_id", "date");

-- CreateTable appointments
CREATE TABLE IF NOT EXISTS "appointments" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "patient_id" TEXT NOT NULL,
    "doctor_id" TEXT NOT NULL,
    "slot_start" TIMESTAMP(3) NOT NULL,
    "slot_end" TIMESTAMP(3) NOT NULL,
    "status" "AppointmentStatus" NOT NULL DEFAULT 'HELD',
    "held_until" TIMESTAMP(3),
    "calendar_event_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "appointments_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "appointments_doctor_id_slot_start_idx" ON "appointments"("doctor_id", "slot_start");
CREATE INDEX IF NOT EXISTS "appointments_patient_id_idx" ON "appointments"("patient_id");
CREATE INDEX IF NOT EXISTS "appointments_status_idx" ON "appointments"("status");
CREATE INDEX IF NOT EXISTS "appointments_held_until_idx" ON "appointments"("held_until");

-- *** CRITICAL: Partial unique index to prevent double-booking at the DB level ***
-- This ensures that for any (doctor_id, slot_start) pair, only ONE row can exist
-- with status HELD or BOOKED. CANCELLED and COMPLETED rows are excluded.
CREATE UNIQUE INDEX IF NOT EXISTS "idx_no_double_booking"
ON "appointments" ("doctor_id", "slot_start")
WHERE "status" IN ('HELD', 'BOOKED');

-- CreateTable symptom_forms
CREATE TABLE IF NOT EXISTS "symptom_forms" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "appointment_id" TEXT NOT NULL,
    "raw_symptoms" TEXT NOT NULL,
    "ai_summary_json" JSONB,
    "ai_prompt_used" TEXT,
    "urgency_level" "UrgencyLevel",
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "symptom_forms_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "symptom_forms_appointment_id_key" ON "symptom_forms"("appointment_id");

-- CreateTable visit_notes
CREATE TABLE IF NOT EXISTS "visit_notes" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "appointment_id" TEXT NOT NULL,
    "clinical_notes" TEXT NOT NULL,
    "prescription" TEXT,
    "ai_patient_summary_json" JSONB,
    "ai_prompt_used" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "visit_notes_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "visit_notes_appointment_id_key" ON "visit_notes"("appointment_id");

-- CreateTable medication_reminders
CREATE TABLE IF NOT EXISTS "medication_reminders" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "visit_note_id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "medication" TEXT NOT NULL,
    "dosage" TEXT NOT NULL,
    "frequency" TEXT NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE,
    "next_send_at" TIMESTAMP(3) NOT NULL,
    "status" "ReminderStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "medication_reminders_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "medication_reminders_next_send_at_status_idx" ON "medication_reminders"("next_send_at", "status");

-- CreateTable notification_logs
CREATE TABLE IF NOT EXISTS "notification_logs" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "type" "NotificationType" NOT NULL,
    "recipient_email" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "status" "NotificationStatus" NOT NULL DEFAULT 'PENDING',
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "max_retries" INTEGER NOT NULL DEFAULT 5,
    "next_retry_at" TIMESTAMP(3),
    "payload" JSONB NOT NULL,
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "notification_logs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "notification_logs_status_next_retry_at_idx" ON "notification_logs"("status", "next_retry_at");

-- Foreign keys
ALTER TABLE "doctor_profiles" DROP CONSTRAINT IF EXISTS "doctor_profiles_user_id_fkey";
ALTER TABLE "doctor_profiles" ADD CONSTRAINT "doctor_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "doctor_leaves" DROP CONSTRAINT IF EXISTS "doctor_leaves_doctor_id_fkey";
ALTER TABLE "doctor_leaves" ADD CONSTRAINT "doctor_leaves_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "doctor_profiles"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "appointments" DROP CONSTRAINT IF EXISTS "appointments_patient_id_fkey";
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "appointments" DROP CONSTRAINT IF EXISTS "appointments_doctor_id_fkey";
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "symptom_forms" DROP CONSTRAINT IF EXISTS "symptom_forms_appointment_id_fkey";
ALTER TABLE "symptom_forms" ADD CONSTRAINT "symptom_forms_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "visit_notes" DROP CONSTRAINT IF EXISTS "visit_notes_appointment_id_fkey";
ALTER TABLE "visit_notes" ADD CONSTRAINT "visit_notes_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "medication_reminders" DROP CONSTRAINT IF EXISTS "medication_reminders_visit_note_id_fkey";
ALTER TABLE "medication_reminders" ADD CONSTRAINT "medication_reminders_visit_note_id_fkey" FOREIGN KEY ("visit_note_id") REFERENCES "visit_notes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "medication_reminders" DROP CONSTRAINT IF EXISTS "medication_reminders_patient_id_fkey";
ALTER TABLE "medication_reminders" ADD CONSTRAINT "medication_reminders_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
