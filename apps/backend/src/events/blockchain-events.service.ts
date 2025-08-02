import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BlockchainEvent } from './entities/blockchain-event.entity';

@Injectable()
export class BlockchainEventsService {
  private readonly logger = new Logger(BlockchainEventsService.name);

  constructor(
    @InjectRepository(BlockchainEvent)
    private readonly blockchainEventRepo: Repository<BlockchainEvent>,
  ) {}

  async create(eventData: {
    contractName: string;
    eventName: string;
    eventData: any;
    blockNumber: number;
    transactionHash: string;
    timestamp: Date;
  }): Promise<BlockchainEvent> {
    try {
      const event = this.blockchainEventRepo.create(eventData);
      return await this.blockchainEventRepo.save(event);
    } catch (error) {
      this.logger.error('Failed to store blockchain event', {
        error: error.message,
        eventData,
      });
      throw error;
    }
  }

  async findAll(filter?: {
    contractName?: string;
    eventName?: string;
    blockNumber?: number;
  }): Promise<BlockchainEvent[]> {
    const query = this.blockchainEventRepo.createQueryBuilder('event');
    
    if (filter?.contractName) {
      query.andWhere('event.contractName = :contractName', { contractName: filter.contractName });
    }
    if (filter?.eventName) {
      query.andWhere('event.eventName = :eventName', { eventName: filter.eventName });
    }
    if (filter?.blockNumber) {
      query.andWhere('event.blockNumber = :blockNumber', { blockNumber: filter.blockNumber });
    }

    return query.orderBy('event.timestamp', 'DESC').getMany();
  }

  async findOne(id: string): Promise<BlockchainEvent> {
    return this.blockchainEventRepo.findOneBy({ id });
  }

  async getEventsByBlock(blockNumber: number): Promise<BlockchainEvent[]> {
    return this.blockchainEventRepo.find({
      where: { blockNumber },
      order: { timestamp: 'ASC' },
    });
  }
}