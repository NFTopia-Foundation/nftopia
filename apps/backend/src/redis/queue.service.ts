import { Injectable, Logger } from '@nestjs/common';
import { Queue, Worker, Job } from 'bullmq';
import { createClient } from 'redis';

@Injectable()
export class QueueService {
  private readonly logger = new Logger(QueueService.name);
  private queues: Map<string, Queue> = new Map();
  private workers: Map<string, Worker> = new Map();

  async enqueue(queueName: string, data: any, options?: any): Promise<Job> {
    let queue = this.queues.get(queueName);
    
    if (!queue) {
      queue = new Queue(queueName, {
        connection: {
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT || '6379'),
        },
      });
      this.queues.set(queueName, queue);
    }

    return await queue.add(queueName, data, options);
  }

  async createWorker(queueName: string, processor: (job: Job) => Promise<any>): Promise<void> {
    const worker = new Worker(queueName, processor, {
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
      },
    });

    worker.on('completed', (job) => {
      this.logger.log(`Job ${job.id} completed for queue ${queueName}`);
    });

    worker.on('failed', (job, err) => {
      this.logger.error(`Job ${job?.id} failed for queue ${queueName}:`, err);
    });

    this.workers.set(queueName, worker);
  }

  async getQueueStatus(queueName: string): Promise<any> {
    const queue = this.queues.get(queueName);
    if (!queue) {
      return { exists: false };
    }

    const [waiting, active, completed, failed] = await Promise.all([
      queue.getWaiting(),
      queue.getActive(),
      queue.getCompleted(),
      queue.getFailed(),
    ]);

    return {
      exists: true,
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length,
    };
  }

  async closeAll(): Promise<void> {
    for (const [name, queue] of this.queues) {
      await queue.close();
      this.logger.log(`Closed queue: ${name}`);
    }

    for (const [name, worker] of this.workers) {
      await worker.close();
      this.logger.log(`Closed worker: ${name}`);
    }

    this.queues.clear();
    this.workers.clear();
  }
} 