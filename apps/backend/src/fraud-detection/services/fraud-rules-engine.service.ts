import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { Transaction } from '../../transactions/entities/transaction.entity';
import { User } from '../../users/entities/user.entity';
import { FraudCheckResult, FraudRiskLevel, TransactionContext } from '../dto/fraud-check-result.dto';

interface FraudRule {
  name: string;
  check: (transaction: Transaction, context: TransactionContext, userHistory: Transaction[]) => Promise<{ triggered: boolean; confidence: number; metadata?: any }>;
  weight: number;
}

@Injectable()
export class FraudRulesEngine {
  constructor(
    @InjectRepository(Transaction)
    private readonly transactionRepo: Repository<Transaction>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  private rules: FraudRule[] = [
    {
      name: 'velocity_check',
      weight: 0.3,
      check: async (transaction, context, userHistory) => {
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        const recentTransactions = userHistory.filter(tx => tx.timestamp > oneHourAgo);
        const triggered = recentTransactions.length > 5;
        return {
          triggered,
          confidence: Math.min(recentTransactions.length / 10, 1),
          metadata: { transactionsInLastHour: recentTransactions.length }
        };
      }
    },
    {
      name: 'geo_discrepancy',
      weight: 0.25,
      check: async (transaction, context) => {
        // Simplified geo check - in production, integrate with GeoIP service
        const suspiciousCountries = ['XX', 'YY']; // Add actual suspicious country codes
        const triggered = context.geoLocation && suspiciousCountries.includes(context.geoLocation.country);
        return {
          triggered,
          confidence: triggered ? 0.8 : 0,
          metadata: { country: context.geoLocation?.country }
        };
      }
    },
    {
      name: 'device_anomaly',
      weight: 0.2,
      check: async (transaction, context, userHistory) => {
        const uniqueUserAgents = new Set(userHistory.map(tx => tx.buyer.id === transaction.buyer.id ? context.deviceInfo.userAgent : null).filter(Boolean));
        const isNewDevice = !uniqueUserAgents.has(context.deviceInfo.userAgent);
        const triggered = isNewDevice && userHistory.length > 0;
        return {
          triggered,
          confidence: triggered ? 0.7 : 0,
          metadata: { isNewDevice, uniqueDevices: uniqueUserAgents.size }
        };
      }
    },
    {
      name: 'amount_spike',
      weight: 0.25,
      check: async (transaction, context, userHistory) => {
        if (userHistory.length === 0) return { triggered: false, confidence: 0 };
        
        const avgAmount = userHistory.reduce((sum, tx) => sum + tx.amount, 0) / userHistory.length;
        const isSpike = transaction.amount > avgAmount * 3;
        return {
          triggered: isSpike,
          confidence: isSpike ? Math.min(transaction.amount / avgAmount / 5, 1) : 0,
          metadata: { averageAmount: avgAmount, currentAmount: transaction.amount, spikeRatio: transaction.amount / avgAmount }
        };
      }
    }
  ];

  async applyRules(transaction: Transaction, context: TransactionContext): Promise<FraudCheckResult> {
    // Get user transaction history (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const userHistory = await this.transactionRepo.find({
      where: {
        buyer: { id: transaction.buyer.id },
        timestamp: MoreThan(thirtyDaysAgo)
      },
      order: { timestamp: 'DESC' }
    });

    const triggeredRules: string[] = [];
    let totalConfidence = 0;
    let totalWeight = 0;
    const ruleResults: Record<string, any> = {};

    for (const rule of this.rules) {
      const result = await rule.check(transaction, context, userHistory);
      if (result.triggered) {
        triggeredRules.push(rule.name);
        totalConfidence += result.confidence * rule.weight;
        ruleResults[rule.name] = result.metadata;
      }
      totalWeight += rule.weight;
    }

    const normalizedConfidence = totalWeight > 0 ? totalConfidence / totalWeight : 0;
    const riskLevel = this.determineRiskLevel(normalizedConfidence);
    const recommendation = this.getRecommendation(riskLevel, normalizedConfidence);

    return {
      isSuspicious: triggeredRules.length > 0,
      riskLevel,
      triggeredRules,
      recommendation,
      confidence: normalizedConfidence,
      metadata: ruleResults
    };
  }

  private determineRiskLevel(confidence: number): FraudRiskLevel {
    if (confidence >= 0.8) return FraudRiskLevel.CRITICAL;
    if (confidence >= 0.6) return FraudRiskLevel.HIGH;
    if (confidence >= 0.4) return FraudRiskLevel.MEDIUM;
    return FraudRiskLevel.LOW;
  }

  private getRecommendation(riskLevel: FraudRiskLevel, confidence: number): 'ALLOW' | 'REVIEW' | 'BLOCK' {
    if (riskLevel === FraudRiskLevel.CRITICAL || confidence >= 0.9) return 'BLOCK';
    if (riskLevel === FraudRiskLevel.HIGH || confidence >= 0.6) return 'REVIEW';
    return 'ALLOW';
  }
}