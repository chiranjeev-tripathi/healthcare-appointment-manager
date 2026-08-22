# 🏥 Healthcare Appointment & Follow-up Manager

A multi-portal healthcare platform for managing appointments, AI-powered visit summaries, and integrated notifications.

---

## 🏗️ Architecture

```
┌─────────────────┐      ┌──────────────────┐      ┌─────────────────┐
│   React + Vite   │─────▶│   Express API     │─────▶│   PostgreSQL     │
│   (TailwindCSS)   │      │   (TypeScript)     │      │   (Prisma ORM)    │
│   Port 5173       │      │   Port 3000        │      │   Port 5432       │
└─────────────────┘      └──────┬───────────┘      └─────────────────┘
                                     │
                    ┌────────────────┼────────────────┐
                    ▼                ▼                ▼
              ┌──────────┐     ┌────────┐      ┌──────────┐
              │  Redis    │     │ Claude  │      │  Google   │
              │ (BullMQ)  │     │  API    │      │ Calendar  │
              │ Port 6379 │     │         │      │  OAuth    │
              └──────────┘     └────────┘      └──────────┘
```

---

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- PostgreSQL 16+
- Redis 7+
- (Optional) Docker & Docker Compose

### Option 1: Docker Compose (Recommended)

```bash
# Clone and configure
cp backend/.env.example backend/.env
# Edit backend/.env with your API keys

# Start everything
docker-compose up -d

# The app will be available at:
# Frontend: http://localhost:5173
# Backend:  http://localhost:3000
```

### Option 2: Manual Setup

```bash
# 1. Database setup
createdb healthcare_db
psql healthcare_db < backend/prisma/migrations/00_init/migration.sql

# 2. Backend setup
cd backend
cp .env.example .env
# Edit .env with your database URL and API keys
npm install
npx prisma generate
npx prisma db push
npm run db:seed        # Seed sample data
npm run dev             # Starts on port 3000

# 3. Frontend setup (new terminal)
cd frontend
npm install
npm run dev             # Starts on port 5173
```

### Default Login Credentials (after seeding)

| Role    | Email                        | Password    |
|---------|-------------------------------|-------------|
| Admin   | admin@healthcare.app          | admin123    |
| Doctor  | sarah.chen@healthcare.app     | doctor123   |
| Patient | alice@example.com             | patient123  |

---

## 📋 Environment Variables

See [`backend/.env.example`](backend/.env.example) for the complete list. Key variables:

| Variable                   | Description                        | Required |
|-----------------------------|-------------------------------------|:--------:|
| `DATABASE_URL`               | PostgreSQL connection string        | ✅ |
| `REDIS_URL`                  | Redis connection string             | ✅ |
| `JWT_SECRET`                 | Secret for access tokens            | ✅ |
| `JWT_REFRESH_SECRET`         | Secret for refresh tokens           | ✅ |
| `ANTHROPIC_API_KEY`          | Claude API key for AI summaries     | Optional* |
| `SMTP_HOST` / `USER` / `PASS`| Email sending credentials           | Optional* |
| `GOOGLE_CLIENT_ID` / `SECRET`| Google Calendar OAuth               | Optional* |

*System degrades gracefully without these — AI summaries show fallback text, emails are logged but not sent.

---

## 🗄️ Database Schema

### Tables

| Table                  | Purpose                                                  |
|--------------------------|-----------------------------------------------------------|
| `users`                   | All users (patients, doctors, admins)                      |
| `doctor_profiles`         | Specialisation, working hours, slot duration, calendar tokens |
| `doctor_leaves`           | Leave days per doctor                                      |
| `appointments`            | Core booking records (HELD → BOOKED → COMPLETED/CANCELLED) |
| `symptom_forms`           | Patient pre-visit symptoms + AI analysis                    |
| `visit_notes`             | Doctor's clinical notes + AI patient summary                |
| `medication_reminders`    | Scheduled medication notifications                          |
| `notification_logs`       | Email/calendar send tracking + retry queue                  |

### Critical Index

```sql
CREATE UNIQUE INDEX idx_no_double_booking
ON appointments (doctor_id, slot_start)
WHERE status IN ('HELD', 'BOOKED');
```

This partial unique index is the primary guard against double-booking.

---

## 🔌 API Documentation

### Authentication

| Method | Endpoint              | Body                            | Auth   | Description             |
|--------|------------------------|----------------------------------|--------|--------------------------|
| POST   | `/api/auth/register`   | `{ name, email, password }`      | —      | Register patient         |
| POST   | `/api/auth/login`      | `{ email, password }`            | —      | Login, returns tokens    |
| POST   | `/api/auth/refresh`    | `{ refreshToken }`               | —      | Rotate tokens            |
| POST   | `/api/auth/logout`     | —                                 | Bearer | Invalidate session       |
| GET    | `/api/auth/me`         | —                                 | Bearer | Current user info        |

### Doctors

| Method | Endpoint                          | Query/Body                              | Auth         | Description                       |
|--------|-------------------------------------|-------------------------------------------|--------------|------------------------------------|
| GET    | `/api/doctors`                       | `?specialisation=`                        | —            | List doctors                       |
| GET    | `/api/doctors/:id`                   | —                                          | —            | Doctor profile                     |
| GET    | `/api/doctors/:id/slots`             | `?date=YYYY-MM-DD`                        | —            | Available slots                    |
| PUT    | `/api/doctors/:id/profile`           | `{ specialisation, workingHours, ... }`   | Doctor/Admin | Update profile                     |
| POST   | `/api/doctors/:id/leave`             | `{ date, reason? }`                       | Doctor/Admin | Add leave (auto-cancels bookings)  |
| DELETE | `/api/doctors/:id/leave/:leaveId`    | —                                          | Doctor/Admin | Remove leave                       |
| GET    | `/api/doctors/:id/leave`             | —                                          | Doctor/Admin | List leave days                    |

### Bookings

| Method | Endpoint                              | Body                       | Auth                  | Description               |
|--------|-----------------------------------------|------------------------------|-------------------------|-----------------------------|
| POST   | `/api/bookings/hold`                     | `{ doctorId, slotStart }`    | Patient                 | Hold slot (5 min TTL)       |
| POST   | `/api/bookings/:id/confirm`              | `{ symptoms }`               | Patient                 | Confirm booking             |
| POST   | `/api/bookings/:id/cancel`               | —                             | Patient/Doctor/Admin    | Cancel appointment          |
| POST   | `/api/bookings/:id/complete`             | —                             | Doctor                  | Mark completed               |
| GET    | `/api/bookings/my`                       | —                             | Patient/Doctor          | My appointments              |
| GET    | `/api/bookings/:id`                      | —                             | Patient/Doctor/Admin    | Appointment detail          |

### Visit Notes

| Method | Endpoint                                              | Body                                  | Auth   | Description                    |
|--------|----------------------------------------------------------|------------------------------------------|--------|----------------------------------|
| POST   | `/api/visits/appointments/:id/notes`                       | `{ clinicalNotes, prescription? }`       | Doctor | Submit notes                     |
| POST   | `/api/visits/appointments/:id/notes/regenerate`            | —                                          | Doctor | Retry AI summary                 |
| GET    | `/api/visits/appointments/:id/summary`                     | —                                          | Patient/Doctor | Patient-friendly summary  |
| GET    | `/api/visits/appointments/:id/notes`                       | —                                          | Doctor | Full clinical notes              |

### Admin

| Method | Endpoint                       | Query/Body                                         | Auth  | Description             |
|--------|-----------------------------------|-------------------------------------------------------|-------|----------------------------|
| GET    | `/api/admin/appointments`          | `?status=&doctorId=&from=&to=`                        | Admin | All appointments           |
| GET    | `/api/admin/system-health`         | —                                                        | Admin | System health stats        |
| POST   | `/api/admin/doctors`               | `{ name, email, password, specialisation, ... }`       | Admin | Create doctor               |

### Calendar

| Method | Endpoint                     | Auth   | Description               |
|--------|---------------------------------|--------|------------------------------|
| GET    | `/api/calendar/auth-url`         | Doctor | Google OAuth URL             |
| GET    | `/api/calendar/callback`         | —      | OAuth callback handler       |

---

## 🤖 LLM Prompts

### Pre-Visit Summary

```
Analyse these symptoms and return a JSON object with these exact fields:
urgency_level (one of: Low, Medium, High),
chief_complaint (string),
suggested_questions (array of exactly 3 strings — questions for the doctor).

Symptoms: {symptoms}

Return ONLY valid JSON, no other text.
```

### Post-Visit Summary

```
Convert these clinical notes into a patient-friendly JSON object with these exact fields:
summary (string — plain language summary),
medication_schedule (array of objects with: medication, dosage, frequency, duration, instructions),
follow_up_steps (array of strings).

Notes: {clinicalNotes}

Return ONLY valid JSON, no other text.
```

Both prompts and responses are stored in the database for audit purposes.

---

## 📅 Google Calendar OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the **Google Calendar API**
4. Go to **Credentials** → **Create Credentials** → **OAuth 2.0 Client ID**
5. Set application type to **Web application**
6. Add authorized redirect URI: `http://localhost:3000/api/calendar/callback`
7. Copy the Client ID and Client Secret to your `.env`:

   ```
   GOOGLE_CLIENT_ID=your-client-id
   GOOGLE_CLIENT_SECRET=your-client-secret
   GOOGLE_REDIRECT_URI=http://localhost:3000/api/calendar/callback
   ```

8. Doctors can connect their calendar from the Doctor Portal settings

---

## 🏗️ Deployment

### Backend (Render/Railway)

1. Connect your Git repo
2. Set build command: `npm install && npx prisma generate && npm run build`
3. Set start command: `node dist/index.js`
4. Add all environment variables from `.env.example`
5. Provision PostgreSQL and Redis add-ons

### Frontend (Vercel)

1. Connect your Git repo, set root to `frontend/`
2. Build command: `npm run build`
3. Output directory: `dist`
4. Add environment variable: `VITE_API_URL=https://your-backend.onrender.com/api`

---

## 📝 Design Documents

- [`SYSTEM_DESIGN.md`](SYSTEM_DESIGN.md) — Double-booking prevention, slot holds, leave conflicts, notification reliability

---

## 📁 Project Structure

```
healthcare-appointment-manager/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma       # Data models
│   │   ├── seed.ts             # Sample data
│   │   └── migrations/         # SQL migrations
│   ├── src/
│   │   ├── config/             # Env, DB, Redis
│   │   ├── middleware/         # Auth, error handler
│   │   ├── routes/             # API routes
│   │   ├── services/           # Business logic
│   │   │   ├── booking.service.ts   # Core booking engine
│   │   │   ├── llm/                 # AI provider
│   │   │   ├── email.service.ts
│   │   │   ├── calendar.service.ts
│   │   │   └── notification.service.ts
│   │   ├── jobs/               # Background workers
│   │   └── types/              # TypeScript types
│   ├── Dockerfile
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/         # Shared UI
│   │   ├── pages/               # Route pages
│   │   │   ├── patient/
│   │   │   ├── doctor/
│   │   │   └── admin/
│   │   ├── services/            # API clients
│   │   ├── stores/               # Zustand state
│   │   └── types/
│   ├── Dockerfile
│   └── package.json
├── docker-compose.yml
├── SYSTEM_DESIGN.md
└── README.md
```

---

## 📄 License

MIT
