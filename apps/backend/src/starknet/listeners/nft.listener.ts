import { Injectable, Inject } from '@nestjs/common';
import { QueueService } from '../../redis/queue.service';
import { BaseListener } from './base-listener';
import { IEventsService, EVENTS_SERVICE } from '../../events/interfaces/events-service.interface';
import { blockchainConfig } from '../../config/blockchain.config';

// Import the NFT contract ABI (you'll need to create this file)
// const NFT_CONTRACT_ABI = require('../abis/nft-contract.abi.json');

// Temporary mock ABI for development
const NFT_CONTRACT_ABI = [
  {
    name: 'Transfer',
    type: 'event',
    keys: [],
    data: [
      { name: 'from', type: 'felt' },
      { name: 'to', type: 'felt' },
      { name: 'tokenId', type: 'Uint256' },
    ],
  },
];

@Injectable()
export class NftListener extends BaseListener {
  constructor(
    private readonly queueService: QueueService,
    @Inject(EVENTS_SERVICE) eventsService?: IEventsService, // Remove private to avoid conflict with BaseListener
  ) {
    super(
      'nft', // contractName
      blockchainConfig.nftContractAddress, // contractAddress
      NFT_CONTRACT_ABI, // contractAbi
      eventsService, // eventsService (optional)
    );
  }

  protected validateEvent(event: any): boolean {
    // Validate NFT Transfer events
    if (event.name === 'Transfer') {
      return (
        event.data &&
        event.data.from !== undefined &&
        event.data.to !== undefined &&
        event.data.tokenId !== undefined
      );
    }

    // Validate other NFT events like Approval, ApprovalForAll, etc.
    if (event.name === 'Approval') {
      return (
        event.data &&
        event.data.owner !== undefined &&
        event.data.approved !== undefined &&
        event.data.tokenId !== undefined
      );
    }

    if (event.name === 'ApprovalForAll') {
      return (
        event.data &&
        event.data.owner !== undefined &&
        event.data.operator !== undefined &&
        event.data.approved !== undefined
      );
    }

    // For unknown events, log and return true to allow processing
    this.logger.warn(`Unknown NFT event type: ${event.name}`);
    return true;
  }

  protected async handleEvent(event: any): Promise<void> {
    this.logger.log(`Processing NFT event: ${event.name}`, {
      blockNumber: event.blockNumber,
      transactionHash: event.transactionHash,
    });

    try {
      // Enqueue the event for processing
      await this.queueService.enqueue('nft-events', {
        ...event,
        contractName: this.contractName,
        processedAt: new Date().toISOString(),
      });

      // Handle specific event types
      switch (event.name) {
        case 'Transfer':
          await this.handleTransferEvent(event);
          break;
        case 'Approval':
          await this.handleApprovalEvent(event);
          break;
        case 'ApprovalForAll':
          await this.handleApprovalForAllEvent(event);
          break;
        default:
          this.logger.debug(`No specific handler for event: ${event.name}`);
      }
    } catch (error) {
      this.logger.error(`Failed to handle NFT event: ${event.name}`, {
        error: error.message,
        event,
      });
      throw error; // Re-throw to trigger retry logic in BaseListener
    }
  }

  private async handleTransferEvent(event: any): Promise<void> {
    const { from, to, tokenId } = event.data;

    this.logger.log(`NFT Transfer: Token ${tokenId} from ${from} to ${to}`);

    // Additional business logic for transfers
    // - Update NFT ownership in database
    // - Trigger notifications
    // - Update marketplace listings if applicable

    // Enqueue specific transfer processing
    await this.queueService.enqueue('nft-transfer-processing', {
      from,
      to,
      tokenId,
      blockNumber: event.blockNumber,
      transactionHash: event.transactionHash,
    });
  }

  private async handleApprovalEvent(event: any): Promise<void> {
    const { owner, approved, tokenId } = event.data;

    this.logger.log(
      `NFT Approval: Token ${tokenId} owner ${owner} approved ${approved}`,
    );

    // Enqueue approval processing
    await this.queueService.enqueue('nft-approval-processing', {
      owner,
      approved,
      tokenId,
      blockNumber: event.blockNumber,
      transactionHash: event.transactionHash,
    });
  }

  private async handleApprovalForAllEvent(event: any): Promise<void> {
    const { owner, operator, approved } = event.data;

    this.logger.log(
      `NFT ApprovalForAll: Owner ${owner} ${approved ? 'approved' : 'revoked'} operator ${operator}`,
    );

    // Enqueue approval for all processing
    await this.queueService.enqueue('nft-approval-all-processing', {
      owner,
      operator,
      approved,
      blockNumber: event.blockNumber,
      transactionHash: event.transactionHash,
    });
  }

  // Override the listen method to add NFT-specific initialization
  async listen(): Promise<void> {
    this.logger.log('Initializing NFT event listener...');

    try {
      // Call parent listen method
      await super.listen();

      this.logger.log('NFT event listener started successfully');
    } catch (error) {
      this.logger.error('Failed to start NFT event listener', error);
      throw error;
    }
  }

  // NFT-specific health check
  async healthCheck(): Promise<any> {
    const baseHealth = await super.healthCheck();

    // Add NFT-specific health metrics
    return {
      ...baseHealth,
      contractAddress: blockchainConfig.nftContractAddress,
      supportedEvents: ['Transfer', 'Approval', 'ApprovalForAll'],
    };
  }
}
