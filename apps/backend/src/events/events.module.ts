// src/events/events.module.ts
import { Module, forwardRef } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { EventsGateway } from './events.gateway';
import { EventsService } from './events.service';
import { BlockchainEventsService } from '../../../backend/src/events/blockchain-events.service';
import { Auction } from '../auctions/entities/auction.entity';
import { Bid } from '../bids/entities/bid.entity';
import { BidsModule } from '../bids/bids.module';
import { AuctionsModule } from '../auctions/auctions.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    EventEmitterModule.forRoot(),
    TypeOrmModule.forFeature([Auction, Bid]),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'my_jwt_secret',
      signOptions: { expiresIn: '7d' },
    }),
    forwardRef(() => BidsModule),
    forwardRef(() => AuctionsModule),
    AuthModule,
  ],
  providers: [EventsGateway, EventsService, BlockchainEventsService],
  exports: [EventsGateway, EventsService, BlockchainEventsService],
})
export class EventsModule {}

