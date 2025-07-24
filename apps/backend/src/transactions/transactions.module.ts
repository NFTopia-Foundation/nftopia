import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Transaction } from './entities/transaction.entity';
import { NFT } from '../nfts/entities/nft.entity';
import { User } from '../users/entities/user.entity';
import { Auction } from '../auctions/entities/auction.entity';
import { TransactionsService } from './transactions.service';
import { TransactionsController } from './transactions.controller';
import { TransactionWebhookController } from './controllers/transaction-webhook.controller';
import { WebhookMetricsController } from './controllers/webhook-metrics.controller';
import { RateLimitMonitorController } from './controllers/rate-limit-monitor.controller';
import { WebhookSignatureService } from './services/webhook-signature.service';
import { WebhookProcessorService } from './services/webhook-processor.service';
import { WebhookMetricsService } from './services/webhook-metrics.service';
import { RateLimitGuard } from './guards/rate-limit.guard';
import { MultiTierRateLimitGuard } from './guards/multi-tier-rate-limit.guard';


@Module({
  imports: [
    TypeOrmModule.forFeature([Transaction, NFT, User, Auction]),
  ],
  controllers: [
    TransactionsController,
    TransactionWebhookController,
    WebhookMetricsController,
    RateLimitMonitorController,
  ],
  providers: [
    TransactionsService,
    WebhookSignatureService,
    WebhookProcessorService,
    WebhookMetricsService,
    RateLimitGuard,
    MultiTierRateLimitGuard,
  ],
  exports: [
    TransactionsService,
    WebhookSignatureService,
    WebhookProcessorService,
    WebhookMetricsService,
    RateLimitGuard,
    MultiTierRateLimitGuard,
  ],
})
export class TransactionsModule {}
