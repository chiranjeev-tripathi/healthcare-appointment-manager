import { WorkingHours, TimeSlot } from '../types';
import prisma from '../config/database';
import { AppointmentStatus } from '@prisma/client';

export class SlotGeneratorService {
  /**
   * Generates available slots for a given doctor on a specific date.
   */
  static async generateAvailableSlots(
    doctorId: string,
    date: Date,
    workingHours: WorkingHours,
    slotDurationMinutes: number
  ): Promise<TimeSlot[]> {
    // 1. Determine the day of week
    const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;
    const dayOfWeek = daysOfWeek[date.getDay()];

    // 2. Get schedule for the day
    const schedule = workingHours[dayOfWeek];
    if (!schedule) {
      return []; // Not working on this day
    }

    // 5. Query DB for doctor leaves on this date
    // Normalize date to start of day in UTC to compare correctly if needed,
    // assuming date is passed as midnight of the requested date.
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const leaves = await prisma.doctorLeave.findMany({
      where: {
        doctorId: doctorId,
        date: {
          gte: startOfDay,
          lte: endOfDay
        }
      }
    });

    if (leaves.length > 0) {
      return []; // Doctor is on leave
    }

    // 4. Query DB for existing appointments (HELD or BOOKED)
    const appointments = await prisma.appointment.findMany({
      where: {
        doctorId: doctorId,
        status: {
          in: [AppointmentStatus.HELD, AppointmentStatus.BOOKED]
        },
        slotStart: {
          gte: startOfDay,
          lte: endOfDay
        }
      }
    });

    // 3. Generate contiguous slots
    const slots: TimeSlot[] = [];
    const [startHour, startMin] = schedule.start.split(':').map(Number);
    const [endHour, endMin] = schedule.end.split(':').map(Number);

    const currentSlot = new Date(date);
    currentSlot.setHours(startHour, startMin, 0, 0);

    const endSlot = new Date(date);
    endSlot.setHours(endHour, endMin, 0, 0);

    while (currentSlot < endSlot) {
      const slotStart = new Date(currentSlot);
      const slotEnd = new Date(currentSlot.getTime() + slotDurationMinutes * 60000);

      if (slotEnd > endSlot) {
        break; // Don't create partial slots that exceed end time
      }

      // 6. Mark slots as unavailable if they overlap with existing appointments
      // Overlap logic: an appointment overlaps if it starts before our slot ends AND ends after our slot starts
      // In a strict slot system, exact matches are sufficient, but this is safer.
      const isAvailable = !appointments.some(app => {
        return (app.slotStart < slotEnd && app.slotEnd > slotStart);
      });

      slots.push({
        start: slotStart.toISOString(),
        end: slotEnd.toISOString(),
        available: isAvailable
      });

      // Move to next slot
      currentSlot.setTime(slotEnd.getTime());
    }

    // 7. Return array of TimeSlot
    return slots;
  }
}
