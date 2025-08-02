import { Module } from '@nestjs/common';
import { RedisIoAdapter } from './redis.adapter';
import { QueueService } from './queue.service';

@Module({
  providers: [RedisIoAdapter, QueueService],
  exports: [RedisIoAdapter, QueueService],
})
export class RedisModule {}