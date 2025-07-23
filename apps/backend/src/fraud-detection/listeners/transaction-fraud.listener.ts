import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { FraudCheckService } from '../services/fraud-check.service';
import { Transaction } from '../../transactions/entities/transaction.entity';
import { TransactionContext } from '../dto/fraud-check-result.dto';

export class TransactionCreatedEvent {
  constructor(
    public readonly transaction: Transaction,
    public readonly context: TransactionContext
  ) {}
}

@Injectable()
export class TransactionFraudListener {
  private readonly logger = new Logger(TransactionFraudListener.name);

  constructor(private readonly fraudCheckService: FraudCheckService) {}

  @OnEvent('transaction.created')
  async handleTransactionCreated(event: TransactionCreatedEvent): Promise<void> {
    this.logger.log(`Processing fraud check for transaction ${event.transaction.id}`);
    
    const result = await this.fraudCheckService.evaluateTransaction(
      event.transaction,
      event.context
    );
    
    // Handle high-risk transactions
    if (result.recommendation === 'BLOCK') {
      this.logger.warn(`Transaction ${event.transaction.id} blocked due to fraud risk`);
      // Implement blocking logic here
    } else if (result.recommendation === 'REVIEW') {
      this.logger.warn(`Transaction ${event.transaction.id} flagged for manual review`);
      // Implement review queue logic here
    }
  }
}