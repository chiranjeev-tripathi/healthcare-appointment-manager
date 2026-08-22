import { Queue, Worker } from 'bullmq';
import { redisClient } from '../config/redis';
import { prisma } from '../config/database';
import { notificationService } from '../services/notification.service';

const queueName = 'medication-reminder';
export const medicationReminderQueue = new Queue(queueName, { connection: redisClient });

const worker = new Worker(
  queueName,
  async () => {
    try {
      const now = new Date();
      
      const reminders = await prisma.medication_reminders.findMany({
        where: {
          status: 'ACTIVE',
          next_send_at: { lte: now },
        },
      });

      for (const reminder of reminders) {
        await notificationService.sendMedicationReminder(reminder.id);
        
        let hoursToAdd = 24; // Default to once daily
        if (reminder.frequency === 'twice_daily') hoursToAdd = 12;
        else if (reminder.frequency === 'thrice_daily') hoursToAdd = 8;
        else if (reminder.frequency === 'once_daily') hoursToAdd = 24;

        const nextSendAt = new Date(now.getTime() + hoursToAdd * 60 * 60 * 1000);
        
        let newStatus = reminder.status;
        if (reminder.end_date && nextSendAt > reminder.end_date) {
          newStatus = 'COMPLETED';
        }

        await prisma.medication_reminders.update({
          where: { id: reminder.id },
          data: {
            next_send_at: nextSendAt,
            status: newStatus,
          },
        });
      }
    } catch (error) {
      console.error('Error in medication-reminder worker:', error);
    }
  },
  { connection: redisClient }
);

medicationReminderQueue.add('process-reminders', {}, { repeat: { every: 5 * 60 * 1000 } }); // 5 mins

export default worker;
