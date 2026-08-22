# System Design — Healthcare Appointment & Follow-up Manager

This document covers the four critical correctness mechanisms in the system.

---

## 1. Double-Booking Prevention

Double-booking is prevented at **three layers**, providing defense in depth:

### Database Layer (Primary)
A **partial unique index** on `appointments(doctor_id, slot_start)` filtered to `status IN ('HELD', 'BOOKED')` makes it physically impossible for two active appointments to occupy the same slot. PostgreSQL enforces this atomically — if two concurrent INSERTs race for the same slot, exactly one commits and the other receives a unique constraint violation (error code P2002), which the application translates into a user-friendly "slot no longer available" response.

### Transaction Layer (Secondary)
All booking operations use **Prisma interactive transactions with Serializable isolation level**. Before inserting, the service executes `SELECT ... FOR UPDATE` to acquire a row-level lock on any existing appointment for that doctor+slot combination. This prevents phantom reads where two transactions both see the slot as empty.

### Application Layer (Tertiary)
Even if the above mechanisms somehow fail, the booking service catches both `PrismaClientKnownRequestError` (P2002) and serialization failures, converting them into `SlotUnavailableError` with HTTP 409. The losing client receives a clear, actionable error message.

**Race condition handling**: When 10 patients simultaneously attempt to book the same slot, exactly one succeeds. The other nine receive immediate 409 responses — no ambiguous states, no retries needed.

---

## 2. Slot Hold Mechanism

The hold mechanism prevents slots from being snatched while a patient fills out the symptom form.

### Flow
1. Patient clicks "Book this slot" → `POST /api/bookings/hold` creates an appointment with `status: HELD` and `held_until: NOW() + 5 minutes`
2. The partial unique index treats HELD the same as BOOKED — no other patient can grab this slot
3. Patient submits symptoms → `POST /api/bookings/:id/confirm` verifies the hold hasn't expired, then transitions to `status: BOOKED`
4. If the patient abandons the form, the hold expires automatically

### Expiry Cleanup
A **BullMQ repeatable job** runs every 60 seconds, querying for appointments where `status = 'HELD' AND held_until < NOW()`. Matching appointments are set to `CANCELLED`, freeing the slot. This ensures abandoned holds don't permanently block slots.

### Edge Cases
- **Confirm after expiry**: If the patient submits after the hold expires, the confirmation transaction detects `held_until < NOW()` and returns `SlotUnavailableError`. The patient must re-book.
- **Rapid re-hold**: Once a hold is cancelled (either by expiry or the patient), the slot is immediately available. The partial unique index only considers HELD and BOOKED rows.

---

## 3. Doctor Leave Conflict Handling

When a doctor is marked on leave for a date that has existing appointments, the system performs an **automatic cancellation cascade**:

### Process
1. Admin/doctor submits `POST /api/doctors/:id/leave` with a target date
2. The system queries all appointments for that doctor on that date where `status IN ('HELD', 'BOOKED')`
3. Each affected appointment is set to `status: CANCELLED`
4. For each cancellation, the notification service:
   - Sends a cancellation email to the patient (fire-and-forget, won't block)
   - Deletes the Google Calendar event if one exists
   - Logs both operations to `notification_logs`
5. The leave record is created in `doctor_leaves`

### Guarantees
- The cancellation is **transactional** — all appointments are cancelled atomically, or none are
- Notification failures don't prevent the leave from being recorded
- Affected patients see their appointment status update immediately
- The admin system health dashboard shows any failed notifications for follow-up

---

## 4. Notification Failure Handling

Notifications (email + Google Calendar) are treated as **non-critical side effects** that must never break the primary booking flow.

### Architecture
All notification sends follow the **fire-and-forget + queue retry** pattern:

1. **Primary send attempt**: After a booking action (confirm/cancel), the notification service is called asynchronously (not awaited in the main transaction). If it fails, the main action still succeeds.

2. **Logging**: Every send attempt — success or failure — is recorded in `notification_logs` with type (EMAIL/CALENDAR), status, payload, and error message.

3. **Retry mechanism**: A BullMQ worker polls `notification_logs` for entries with `status = FAILED AND next_retry_at <= NOW() AND retry_count < max_retries`. Failed sends are retried with **exponential backoff**:
   - Retry 1: 2 minutes
   - Retry 2: 4 minutes  
   - Retry 3: 8 minutes
   - Retry 4: 16 minutes
   - Retry 5: 32 minutes

4. **Dead letter**: After 5 failed retries, the notification is marked `DEAD_LETTER`. These appear on the admin system health dashboard for manual intervention.

### LLM Failure Handling
LLM calls (pre-visit and post-visit summaries) follow a similar resilience pattern:
- Calls have a 30-second timeout
- On failure, a **fallback placeholder** is saved (e.g., "Summary unavailable — please review notes manually")
- Doctors can trigger **manual regeneration** via `POST /api/visits/appointments/:id/notes/regenerate`
- The appointment/notes flow completes successfully regardless of LLM status

---

*Total: ~780 words*
