import { Queue, Worker } from 'bullmq';
import { redisClient } from '../config/redis';
import { prisma } from '../config/database';
import { emailService } from '../services/email.service';

const queueName = 'notification-retry';
export const notificationRetryQueue = new Queue(queueName, { connection: redisClient });
const MAX_RETRIES = 5;

const worker = new Worker(
  queueName,
  async () => {
    try {
      const now = new Date();
      
      const failedLogs = await prisma.notification_logs.findMany({
        where: {
          status: 'FAILED',
          next_retry_at: { lte: now },
          retry_count: { lt: MAX_RETRIES },
        },
        take: 50,
      });

      for (const log of failedLogs) {
        try {
          // Re-attempt based on type (currently only email is explicitly stored)
          if (log.type.includes('email') || log.type.includes('booking') || log.type.includes('cancellation') || log.type.includes('medication')) {
            await emailService.sendEmail({
              to: log.target,
              subject: 'Notification Retry', // Ideally we'd store original subject
              html: log.content,
              referenceId: log.reference_id || undefined,
              type: log.type,
            });
          }
          
          await prisma.notification_logs.update({
            where: { id: log.id },
            data: { status: 'SENT' },
          });
        } catch (error) {
          const newRetryCount = (log.retry_count || 0) + 1;
          
          if (newRetryCount >= MAX_RETRIES) {
            await prisma.notification_logs.update({
              where: { id: log.id },
              data: { status: 'DEAD_LETTER' },
            });
          } else {
            // Exponential backoff: base 2 minutes * 2^retry_count
            const backoffMinutes = 2 * Math.pow(2, newRetryCount);
            const nextRetry = new Date(Date.now() + backoffMinutes * 60 * 1000);
            
            await prisma.notification_logs.update({
              where: { id: log.id },
              data: {
                status: 'FAILED',
                retry_count: newRetryCount,
                next_retry_at: nextRetry,
                error_message: error instanceof Error ? error.message : String(error),
              },
            });
          }
        }
      }
    } catch (error) {
      console.error('Error in notification-retry worker:', error);
    }
  },
  { connection: redisClient }
);

notificationRetryQueue.add('process-retries', {}, { repeat: { every: 60000 } });

export default worker;
