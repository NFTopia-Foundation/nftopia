import { Worker, Queue } from 'bullmq';
import { redisOptions } from '../config/redis.config';
import { redisClient } from '../config/redis.config';
import * as Sentry from '@sentry/node';

export const onchainWorker = new Worker(
  'onchain-queue',
  async job => {
    try {
      // Simulate on-chain logic
    } catch (error) {
      console.error(`Job failed: ${job.id}`, error);
      throw error;
    }
  },
  {
    connection: redisClient,
    timeout: 15000,
    limiter: {
      max: 1000,
      duration: 60000,
    },
}
);

onchainWorker.on('completed', job => {
  console.log(`Completed job ${job.id}`);
});

onchainWorker.on('failed', async (job, err) => {
  console.error(`Failed job ${job.id}:`, err);

  if (job && job.attemptsMade >= job.opts.attempts!) {
    const dlqQueue = new Queue('onchain-dlq', { connection: redisOptions });
    await dlqQueue.add('failed-job', job.data);
  }

  Sentry.captureException(err);
});
