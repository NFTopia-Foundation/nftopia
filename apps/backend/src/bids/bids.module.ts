import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Bid } from './entities/bid.entity';
import { Auction } from '../auctions/entities/auction.entity';
import { User } from '../users/entities/user.entity';
import { BidsService } from './bids.service';
import { BidsController } from './bids.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Bid, Auction, User])],
  controllers: [BidsController],
  providers: [BidsService],
  exports: [BidsService],
})
export class BidsModule {}
