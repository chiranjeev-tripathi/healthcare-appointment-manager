import { Queue, Worker } from 'bullmq';
import { redisClient } from '../config/redis';
import { prisma } from '../config/database';

const queueName = 'slot-hold-expiry';

export const slotHoldExpiryQueue = new Queue(queueName, { connection: redisClient });

const worker = new Worker(
  queueName,
  async () => {
    try {
      const now = new Date();
      
      const expiredHolds = await prisma.appointment.findMany({
        where: {
          status: 'HELD',
          held_until: { lt: now },
        },
      });

      if (expiredHolds.length === 0) return;

      const result = await prisma.appointment.updateMany({
        where: {
          id: { in: expiredHolds.map(a => a.id) },
        },
        data: {
          status: 'CANCELLED',
        },
      });

      console.log(`Expired holds processed: ${result.count} appointments cancelled.`);
    } catch (error) {
      console.error('Error in slot-hold-expiry worker:', error);
    }
  },
  { connection: redisClient }
);

// Add repeatable job every 60 seconds
slotHoldExpiryQueue.add(
  'process-expired-holds',
  {},
  {
    repeat: {
      every: 60000, // 60 seconds
    },
  }
);

export default worker;
