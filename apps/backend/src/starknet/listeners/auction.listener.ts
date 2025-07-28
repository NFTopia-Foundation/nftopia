import { Injectable, Inject } from '@nestjs/common';
import { QueueService } from '../../redis/queue.service';
import { BaseListener } from './base-listener';
import { IEventsService, EVENTS_SERVICE } from '../../events/interfaces/events-service.interface';
import { blockchainConfig } from '../../config/blockchain.config';

// Temporary mock ABI for development
const AUCTION_CONTRACT_ABI = [
  {
    name: 'BidPlaced',
    type: 'event',
    keys: [],
    data: [
      { name: 'bidder', type: 'felt' },
      { name: 'amount', type: 'Uint256' },
      { name: 'auctionId', type: 'felt' },
    ],
  },
  {
    name: 'AuctionCreated',
    type: 'event',
    keys: [],
    data: [
      { name: 'creator', type: 'felt' },
      { name: 'auctionId', type: 'felt' },
      { name: 'startPrice', type: 'Uint256' },
      { name: 'duration', type: 'felt' },
    ],
  },
  {
    name: 'AuctionEnded',
    type: 'event',
    keys: [],
    data: [
      { name: 'auctionId', type: 'felt' },
      { name: 'winner', type: 'felt' },
      { name: 'winningBid', type: 'Uint256' },
    ],
  },
];

@Injectable()
export class AuctionListener extends BaseListener {
  constructor(
    private readonly queueService: QueueService,
    @Inject(EVENTS_SERVICE) eventsService?: IEventsService, // Remove private to avoid conflict with BaseListener
  ) {
    super(
      'auction',
      blockchainConfig.auctionContractAddress,
      AUCTION_CONTRACT_ABI,
      eventsService,
    );
  }

  protected validateEvent(event: any): boolean {
    switch (event.name) {
      case 'BidPlaced':
        return (
          event.data &&
          event.data.bidder !== undefined &&
          event.data.amount !== undefined &&
          event.data.auctionId !== undefined
        );

      case 'AuctionCreated':
        return (
          event.data &&
          event.data.creator !== undefined &&
          event.data.auctionId !== undefined &&
          event.data.startPrice !== undefined &&
          event.data.duration !== undefined
        );

      case 'AuctionEnded':
        return (
          event.data &&
          event.data.auctionId !== undefined &&
          event.data.winner !== undefined &&
          event.data.winningBid !== undefined
        );

      default:
        this.logger.warn(`Unknown auction event type: ${event.name}`);
        return true;
    }
  }

  protected async handleEvent(event: any): Promise<void> {
    this.logger.log(`Processing Auction event: ${event.name}`, {
      blockNumber: event.blockNumber,
      transactionHash: event.transactionHash,
    });

    try {
      // Enqueue the event for processing
      await this.queueService.enqueue('auction-events', {
        ...event,
        contractName: this.contractName,
        processedAt: new Date().toISOString(),
      });

      // Handle specific event types
      switch (event.name) {
        case 'BidPlaced':
          await this.handleBidPlacedEvent(event);
          break;
        case 'AuctionCreated':
          await this.handleAuctionCreatedEvent(event);
          break;
        case 'AuctionEnded':
          await this.handleAuctionEndedEvent(event);
          break;
        default:
          this.logger.debug(`No specific handler for event: ${event.name}`);
      }
    } catch (error) {
      this.logger.error(`Failed to handle Auction event: ${event.name}`, {
        error: error.message,
        event,
      });
      throw error;
    }
  }

  private async handleBidPlacedEvent(event: any): Promise<void> {
    const { bidder, amount, auctionId } = event.data;

    this.logger.log(
      `Bid placed: ${amount} by ${bidder} on auction ${auctionId}`,
    );

    // Enqueue bid processing
    await this.queueService.enqueue('bid-processing', {
      bidder,
      amount,
      auctionId,
      blockNumber: event.blockNumber,
      transactionHash: event.transactionHash,
    });
  }

  private async handleAuctionCreatedEvent(event: any): Promise<void> {
    const { creator, auctionId, startPrice, duration } = event.data;

    this.logger.log(
      `Auction created: ID ${auctionId} by ${creator} with start price ${startPrice}`,
    );

    // Enqueue auction creation processing
    await this.queueService.enqueue('auction-creation-processing', {
      creator,
      auctionId,
      startPrice,
      duration,
      blockNumber: event.blockNumber,
      transactionHash: event.transactionHash,
    });
  }

  private async handleAuctionEndedEvent(event: any): Promise<void> {
    const { auctionId, winner, winningBid } = event.data;

    this.logger.log(
      `Auction ended: ID ${auctionId}, winner ${winner}, winning bid ${winningBid}`,
    );

    // Enqueue auction completion processing
    await this.queueService.enqueue('auction-completion-processing', {
      auctionId,
      winner,
      winningBid,
      blockNumber: event.blockNumber,
      transactionHash: event.transactionHash,
    });
  }

  async healthCheck(): Promise<any> {
    const baseHealth = await super.healthCheck();

    return {
      ...baseHealth,
      contractAddress: blockchainConfig.auctionContractAddress,
      supportedEvents: ['BidPlaced', 'AuctionCreated', 'AuctionEnded'],
    };
  }
}
