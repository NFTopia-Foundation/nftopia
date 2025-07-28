import { Injectable, Inject } from '@nestjs/common';
import { QueueService } from '../../redis/queue.service';
import { BaseListener } from './base-listener';
import { IEventsService, EVENTS_SERVICE } from '../../events/interfaces/events-service.interface';
import { blockchainConfig } from '../../config/blockchain.config';

// Temporary mock ABI for development
const TRANSACTION_CONTRACT_ABI = [
  {
    name: 'TransactionProcessed',
    type: 'event',
    keys: [],
    data: [
      { name: 'txHash', type: 'felt' },
      { name: 'status', type: 'felt' },
      { name: 'amount', type: 'Uint256' },
    ],
  },
  {
    name: 'PaymentReceived',
    type: 'event',
    keys: [],
    data: [
      { name: 'from', type: 'felt' },
      { name: 'to', type: 'felt' },
      { name: 'amount', type: 'Uint256' },
      { name: 'token', type: 'felt' },
    ],
  },
  {
    name: 'RefundIssued',
    type: 'event',
    keys: [],
    data: [
      { name: 'to', type: 'felt' },
      { name: 'amount', type: 'Uint256' },
      { name: 'reason', type: 'felt' },
    ],
  },
];

@Injectable()
export class TransactionListener extends BaseListener {
  constructor(
    private readonly queueService: QueueService,
    @Inject(EVENTS_SERVICE) eventsService?: IEventsService,
  ) {
    super(
      'transaction',
      blockchainConfig.transactionContractAddress,
      TRANSACTION_CONTRACT_ABI,
      eventsService,
    );
  }

  protected validateEvent(event: any): boolean {
    switch (event.name) {
      case 'TransactionProcessed':
        return (
          event.data &&
          event.data.txHash !== undefined &&
          event.data.status !== undefined
        );

      case 'PaymentReceived':
        return (
          event.data &&
          event.data.from !== undefined &&
          event.data.to !== undefined &&
          event.data.amount !== undefined &&
          event.data.token !== undefined
        );

      case 'RefundIssued':
        return (
          event.data &&
          event.data.to !== undefined &&
          event.data.amount !== undefined &&
          event.data.reason !== undefined
        );

      default:
        this.logger.warn(`Unknown transaction event type: ${event.name}`);
        return true;
    }
  }

  protected async handleEvent(event: any): Promise<void> {
    this.logger.log(`Processing Transaction event: ${event.name}`, {
      blockNumber: event.blockNumber,
      transactionHash: event.transactionHash,
    });

    try {
      // Enqueue the event for processing
      await this.queueService.enqueue('transaction-events', {
        ...event,
        contractName: this.contractName,
        processedAt: new Date().toISOString(),
      });

      // Handle specific event types
      switch (event.name) {
        case 'TransactionProcessed':
          await this.handleTransactionProcessedEvent(event);
          break;
        case 'PaymentReceived':
          await this.handlePaymentReceivedEvent(event);
          break;
        case 'RefundIssued':
          await this.handleRefundIssuedEvent(event);
          break;
        default:
          this.logger.debug(`No specific handler for event: ${event.name}`);
      }
    } catch (error) {
      this.logger.error(`Failed to handle Transaction event: ${event.name}`, {
        error: error.message,
        event,
      });
      throw error;
    }
  }

  private async handleTransactionProcessedEvent(event: any): Promise<void> {
    const { txHash, status, amount } = event.data;

    this.logger.log(`Transaction processed: ${txHash} with status ${status}`);

    // Enqueue transaction status update
    await this.queueService.enqueue('transaction-status-update', {
      txHash,
      status,
      amount,
      blockNumber: event.blockNumber,
      transactionHash: event.transactionHash,
    });
  }

  private async handlePaymentReceivedEvent(event: any): Promise<void> {
    const { from, to, amount, token } = event.data;

    this.logger.log(
      `Payment received: ${amount} ${token} from ${from} to ${to}`,
    );

    // Enqueue payment processing
    await this.queueService.enqueue('payment-processing', {
      from,
      to,
      amount,
      token,
      blockNumber: event.blockNumber,
      transactionHash: event.transactionHash,
    });
  }

  private async handleRefundIssuedEvent(event: any): Promise<void> {
    const { to, amount, reason } = event.data;

    this.logger.log(`Refund issued: ${amount} to ${to}, reason: ${reason}`);

    // Enqueue refund processing
    await this.queueService.enqueue('refund-processing', {
      to,
      amount,
      reason,
      blockNumber: event.blockNumber,
      transactionHash: event.transactionHash,
    });
  }

  async healthCheck(): Promise<any> {
    const baseHealth = await super.healthCheck();

    return {
      ...baseHealth,
      contractAddress: blockchainConfig.transactionContractAddress,
      supportedEvents: [
        'TransactionProcessed',
        'PaymentReceived',
        'RefundIssued',
      ],
    };
  }
}
