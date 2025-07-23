import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { FraudCheck } from './entities/fraud-check.entity';
import { Transaction } from '../transactions/entities/transaction.entity';
import { User } from '../users/entities/user.entity';
import { FraudCheckService } from './services/fraud-check.service';
import { FraudRulesEngine } from './services/fraud-rules-engine.service';
import { TransactionFraudListener } from './listeners/transaction-fraud.listener';
import { FraudDetectionController } from './fraud-detection.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([FraudCheck, Transaction, User]),
    ScheduleModule.forRoot(),
    EventEmitterModule.forRoot()
  ],
  controllers: [FraudDetectionController],
  providers: [
    FraudCheckService,
    FraudRulesEngine,
    TransactionFraudListener
  ],
  exports: [FraudCheckService]
})
export class FraudDetectionModule {}