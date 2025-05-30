/* eslint-disable prettier/prettier */
import { Module } from '@nestjs/common';
import { EventsGateway } from './events.gateway';
import { EventsService } from './events.service';
import { JwtModule } from '@nestjs/jwt';
import { AuctionsModule } from '../auctions/auctions.module';
import { BidsModule } from '../bids/bids.module';

@Module({
  imports: [JwtModule.register({}), AuctionsModule, BidsModule],
  providers: [EventsGateway, EventsService],
})
export class EventsModule {}
