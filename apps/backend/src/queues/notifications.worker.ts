import { Worker, Queue } from 'bullmq';
import { redisClient, redisOptions } from '../config/redis.config';

// Worker for processing notifications
export const notificationsWorker = new Worker(
  'notifications-queue',
  async job => {
    try {
      // TODO: Replace this with actual notification logic
      console.log(`Processing notification job ${job.id} with data:`, job.data);

    } catch (error) {
      console.error(`Job ${job.id} failed:`, error);
      throw error;
    }
  },
  {
    connection: redisClient,
    timeout: 15000,
    limiter: {
      max: 1000,
      duration: 60000, // Optional rate limiting
    },
  }
);

// Job completed event
notificationsWorker.on('completed', job => {
  console.log(`Notification job ${job.id} completed successfully.`);
});

// Job failed event (with DLQ fallback)
notificationsWorker.on('failed', async (job, err) => {
  console.error(`Notification job ${job?.id} failed:`, err);

  if (job && job.attemptsMade >= job.opts.attempts!) {
    // Move to Dead Letter Queue
    const dlqQueue = new Queue('notifications-dlq', { connection: redisOptions });
    await dlqQueue.add('failed-notification-job', job.data);
    console.warn(`Moved job ${job.id} to DLQ.`);
  }
});
