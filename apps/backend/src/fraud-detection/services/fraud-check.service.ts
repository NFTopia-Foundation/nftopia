import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Transaction } from '../../transactions/entities/transaction.entity';
import { FraudCheck } from '../entities/fraud-check.entity';
import { FraudRulesEngine } from './fraud-rules-engine.service';
import {
  FraudCheckResult,
  TransactionContext,
} from '../dto/fraud-check-result.dto';

@Injectable()
export class FraudCheckService {
  private readonly logger = new Logger(FraudCheckService.name);

  constructor(
    @InjectRepository(Transaction)
    private readonly transactionRepo: Repository<Transaction>,
    @InjectRepository(FraudCheck)
    private readonly fraudCheckRepo: Repository<FraudCheck>,
    private readonly rulesEngine: FraudRulesEngine,
  ) {}

  async evaluateTransaction(
    transaction: Transaction,
    context: TransactionContext,
  ): Promise<FraudCheckResult> {
    try {
      this.logger.log(`Evaluating transaction ${transaction.id} for fraud`);

      const result = await this.rulesEngine.applyRules(transaction, context);

      // Save fraud check result
      const fraudCheck = this.fraudCheckRepo.create({
        transaction,
        user: transaction.buyer,
        riskLevel: result.riskLevel,
        isSuspicious: result.isSuspicious,
        triggeredRules: result.triggeredRules,
        recommendation: result.recommendation,
        confidence: result.confidence,
        metadata: result.metadata,
        ipAddress: context.deviceInfo.ipAddress,
        userAgent: context.deviceInfo.userAgent,
      });

      await this.fraudCheckRepo.save(fraudCheck);

      this.logger.log(
        `Fraud check completed for transaction ${transaction.id}: ${result.recommendation}`,
      );

      return result;
    } catch (error) {
      this.logger.error(
        `Error evaluating transaction ${transaction.id}:`,
        error,
      );
      // Return safe default in case of error
      return {
        isSuspicious: false,
        riskLevel: 'LOW' as any,
        triggeredRules: [],
        recommendation: 'ALLOW',
        confidence: 0,
      };
    }
  }

  @Cron('0 */15 * * * *') // Every 15 minutes
  async reviewPendingTransactions(): Promise<void> {
    this.logger.log('Starting batch review of pending transactions');

    const pendingTransactions = await this.transactionRepo.find({
      where: { status: 'pending' },
      relations: ['buyer', 'seller', 'nft'],
    });

    for (const transaction of pendingTransactions) {
      // Create minimal context for batch processing
      const context: TransactionContext = {
        deviceInfo: {
          userAgent: 'batch-process',
          ipAddress: '0.0.0.0',
        },
      };

      await this.evaluateTransaction(transaction, context);
    }

    this.logger.log(
      `Completed batch review of ${pendingTransactions.length} pending transactions`,
    );
  }

  async getFraudMetrics(): Promise<{
    detectionRate: number;
    falsePositiveRate: number;
    ruleEffectiveness: Record<string, number>;
  }> {
    const totalChecks = await this.fraudCheckRepo.count();
    const suspiciousChecks = await this.fraudCheckRepo.count({
      where: { isSuspicious: true },
    });

    // Calculate detection rate
    const detectionRate = totalChecks > 0 ? suspiciousChecks / totalChecks : 0;

    // For false positive rate, you'd need manual review data
    // This is a simplified calculation
    const falsePositiveRate = 0.05; // Placeholder - implement based on manual reviews

    // Rule effectiveness analysis
    const allChecks = await this.fraudCheckRepo.find();
    const ruleEffectiveness: Record<string, number> = {};

    for (const check of allChecks) {
      for (const rule of check.triggeredRules) {
        ruleEffectiveness[rule] = (ruleEffectiveness[rule] || 0) + 1;
      }
    }

    return {
      detectionRate,
      falsePositiveRate,
      ruleEffectiveness,
    };
  }
}
