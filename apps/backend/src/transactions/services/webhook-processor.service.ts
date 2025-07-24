import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Transaction } from '../entities/transaction.entity';
import { StarknetTransactionEvent } from '../dto/starknet-transaction-event.dto';
import { TransactionStatus } from '../enums/transaction-status.enum';
import { WebhookMetricsService } from './webhook-metrics.service';

@Injectable()
export class WebhookProcessorService {
  private readonly logger = new Logger(WebhookProcessorService.name);
  private readonly processedEvents = new Set<string>(); // Simple in-memory deduplication

  constructor(
    @InjectRepository(Transaction)
    private transactionRepository: Repository<Transaction>,
    private readonly metricsService: WebhookMetricsService,
  ) {}

  /**
   * Process Starknet transaction event with retry mechanism
   * @param event The Starknet transaction event
   * @param retryCount Current retry attempt (default: 0)
   * @returns Promise<void>
   */
  async processTransactionEvent(
    event: StarknetTransactionEvent,
    retryCount: number = 0
  ): Promise<void> {
    const maxRetries = 3;
    const eventId = `${event.txHash}-${event.blockNumber}`;

    try {
      // Check for idempotency - prevent duplicate processing
      if (this.processedEvents.has(eventId)) {
        this.logger.log(`Event ${eventId} already processed, skipping`);
        return;
      }

      this.logger.log(`Processing transaction event: ${eventId}, attempt: ${retryCount + 1}`);

      // Find existing transaction by hash
      const existingTransaction = await this.transactionRepository.findOne({
        where: { transactionHash: event.txHash }
      });

      if (!existingTransaction) {
        this.logger.warn(`Transaction not found for hash: ${event.txHash}`);
        return;
      }

      // Update transaction status
      await this.updateTransactionStatus(existingTransaction, event);

      // Process event logs for additional data
      await this.processEventLogs(event, existingTransaction);

      // Mark as processed for idempotency
      this.processedEvents.add(eventId);

      this.logger.log(`Successfully processed event: ${eventId}`);

    } catch (error) {
      this.logger.error(`Error processing event ${eventId}:`, error);

      if (retryCount < maxRetries) {
        this.metricsService.recordRetry();
        const delay = Math.pow(2, retryCount) * 1000; // Exponential backoff
        this.logger.log(`Retrying event ${eventId} in ${delay}ms`);

        setTimeout(() => {
          this.processTransactionEvent(event, retryCount + 1);
        }, delay);
      } else {
        this.logger.error(`Max retries exceeded for event ${eventId}`);
        // TODO: Send to dead letter queue or alert system
      }
    }
  }

  /**
   * Update transaction status based on Starknet event
   */
  private async updateTransactionStatus(
    transaction: Transaction,
    event: StarknetTransactionEvent
  ): Promise<void> {
    const oldStatus = transaction.status;
    transaction.status = event.status as any;

    await this.transactionRepository.save(transaction);

    this.logger.log(
      `Transaction ${transaction.id} status updated: ${oldStatus} -> ${event.status}`
    );

    // TODO: Trigger notification service
    await this.notifyStatusChange(transaction, oldStatus, event.status);
  }

  /**
   * Process event logs for additional transaction data
   */
  private async processEventLogs(
    event: StarknetTransactionEvent,
    transaction: Transaction
  ): Promise<void> {
    for (const log of event.logs) {
      this.logger.log(`Processing log: ${log.eventType} from ${log.contractAddress}`);
      
      // Process different event types
      switch (log.eventType) {
        case 'Transfer':
          await this.processTransferEvent(log, transaction);
          break;
        case 'Approval':
          await this.processApprovalEvent(log, transaction);
          break;
        default:
          this.logger.log(`Unknown event type: ${log.eventType}`);
      }
    }
  }

  /**
   * Process Transfer events
   */
  private async processTransferEvent(log: any, transaction: Transaction): Promise<void> {
    // Implementation for transfer event processing
    this.logger.log(`Processing transfer event for transaction ${transaction.id}`);
  }

  /**
   * Process Approval events
   */
  private async processApprovalEvent(log: any, transaction: Transaction): Promise<void> {
    // Implementation for approval event processing
    this.logger.log(`Processing approval event for transaction ${transaction.id}`);
  }

  /**
   * Notify external services about status changes
   */
  private async notifyStatusChange(
    transaction: Transaction,
    oldStatus: string,
    newStatus: TransactionStatus
  ): Promise<void> {
    // TODO: Implement notification service integration
    this.logger.log(`Notification: Transaction ${transaction.id} changed from ${oldStatus} to ${newStatus}`);
  }
}
