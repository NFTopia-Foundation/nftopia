import { Module, OnModuleInit, Injectable } from '@nestjs/common';
import { RedisModule } from '../../redis/redis.module';
import { NftListener } from './nft.listener';
import { AuctionListener } from './auction.listener';
import { TransactionListener } from './transaction.listener';
import { BlockchainEventsService } from '../../events/blockchain-events.service';
import { EVENTS_SERVICE } from '../../events/interfaces/events-service.interface';

@Injectable()
export class ListenerBootstrapService implements OnModuleInit {
  constructor(
    private readonly nftListener: NftListener,
    private readonly auctionListener: AuctionListener,
    private readonly transactionListener: TransactionListener,
  ) {}

  onModuleInit() {
    this.nftListener.listen();
    this.auctionListener.listen();
    this.transactionListener.listen();
  }
}

@Module({
  imports: [RedisModule],
  providers: [
    NftListener,
    AuctionListener,
    TransactionListener,
    ListenerBootstrapService,
    BlockchainEventsService,
    { provide: EVENTS_SERVICE, useClass: BlockchainEventsService },
  ],
  exports: [NftListener, AuctionListener, TransactionListener],
})
export class ListenerModule {} 