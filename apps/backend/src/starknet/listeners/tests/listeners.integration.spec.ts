
import { Test, TestingModule } from '@nestjs/testing';
import { NftListener } from '../nft.listener';
import { AuctionListener } from '../auction.listener';
import { TransactionListener } from '../transaction.listener';
import { QueueService } from '../../../redis/queue.service';
import { EventsService } from '../../../events/events.service';
import { MockEventsService } from '../../../events/interfaces/events-service.interface';
import { blockchainConfig } from '../../../config/blockchain.config';
import { Job } from 'bullmq';

// Create proper Job mock
const createMockJob = (data: any): Partial<Job> => ({
  id: 'job-123',
  name: 'test-job',
  data,
  opts: {},
  timestamp: Date.now(),
  delay: 0,
  attemptsMade: 0,
  processedOn: Date.now(),
  finishedOn: Date.now(),
  progress: 0,
  returnvalue: null,
  failedReason: null,
  stacktrace: [],
  remove: jest.fn(),
  retry: jest.fn(),
  promote: jest.fn(),
  moveToCompleted: jest.fn(),
  moveToFailed: jest.fn(),
  toJSON: jest.fn(),
  asJSON: jest.fn(),
  log: jest.fn(),
  getState: jest.fn(),
});

// Mock StarkNet provider responses
const mockProvider = {
  getBlockWithTxHashes: jest.fn().mockResolvedValue({
    block_number: 1000,
    block_hash: '0xhash',
    transactions: [],
  }),
  getEvents: jest.fn().mockResolvedValue({
    events: [
      {
        keys: ['Transfer'],
        data: ['0xabc', '0xdef', '123'],
        block_number: 999,
        transaction_hash: '0xhash123',
      },
    ],
  }),
  getBlock: jest.fn().mockResolvedValue({
    block_number: 1000,
    block_hash: '0xhash',
  }),
};

jest.mock('starknet', () => ({
  RpcProvider: jest.fn().mockImplementation(() => mockProvider),
  SequencerProvider: jest.fn().mockImplementation(() => mockProvider),
  Contract: jest.fn().mockImplementation(() => ({})),
}));

describe('StarkNet Listeners Integration', () => {
  let nftListener: NftListener;
  let auctionListener: AuctionListener;
  let transactionListener: TransactionListener;
  let mockQueueService: Record<string, any>;
  let mockEventsService: MockEventsService;

  beforeEach(async () => {
    mockQueueService = {
      enqueue: jest.fn().mockResolvedValue(createMockJob({})),
      createWorker: jest.fn(),
      getQueueStatus: jest.fn(),
      closeAll: jest.fn(),
    };

    mockEventsService = new MockEventsService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NftListener,
        AuctionListener,
        TransactionListener,
        { provide: QueueService, useValue: mockQueueService },
        { provide: EventsService, useValue: mockEventsService },
      ],
    }).compile();

    nftListener = module.get<NftListener>(NftListener);
    auctionListener = module.get<AuctionListener>(AuctionListener);
    transactionListener = module.get<TransactionListener>(TransactionListener);
  });

  describe('Listener Initialization', () => {
    it('should initialize all listeners with correct configurations', () => {
      expect(nftListener).toBeDefined();
      expect(auctionListener).toBeDefined();
      expect(transactionListener).toBeDefined();

      expect(nftListener['contractName']).toBe('nft');
      expect(auctionListener['contractName']).toBe('auction');
      expect(transactionListener['contractName']).toBe('transaction');
    });

    it('should initialize with correct contract addresses', () => {
      expect(nftListener['contractAddress']).toBe(
        blockchainConfig.nftContractAddress,
      );
      expect(auctionListener['contractAddress']).toBe(
        blockchainConfig.auctionContractAddress,
      );
      expect(transactionListener['contractAddress']).toBe(
        blockchainConfig.transactionContractAddress,
      );
    });
  });

  describe('Event Processing Performance', () => {
    it('should process NFT events within latency requirements', async () => {
      const event = {
        name: 'Transfer',
        data: { from: '0xabc', to: '0xdef', tokenId: '123' },
        blockNumber: 1000,
        transactionHash: '0xhash123',
      };

      const startTime = Date.now();
      await nftListener['processEvent'](event);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(500); // <500ms requirement
      expect(mockQueueService.enqueue).toHaveBeenCalledWith(
        'nft-events',
        expect.any(Object),
      );
    });

    it('should process auction events within latency requirements', async () => {
      const event = {
        name: 'BidPlaced',
        data: { bidder: '0xaaa', amount: '1000', auctionId: '42' },
        blockNumber: 1000,
        transactionHash: '0xhash123',
      };

      const startTime = Date.now();
      await auctionListener['processEvent'](event);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(500);
      expect(mockQueueService.enqueue).toHaveBeenCalledWith(
        'auction-events',
        expect.any(Object),
      );
    });

    it('should track performance metrics correctly', async () => {
      const event = {
        name: 'Transfer',
        data: { from: '0xabc', to: '0xdef', tokenId: '123' },
      };

      // Process multiple events
      for (let i = 0; i < 5; i++) {
        await nftListener['processEvent'](event);
      }

      const metrics = nftListener.getPerformanceMetrics();
      expect(metrics.eventsProcessed).toBe(5);
      expect(metrics.avgProcessingTime).toBeGreaterThan(0);
      expect(metrics.maxProcessingTime).toBeGreaterThan(0);
    });
  });

  describe('Error Recovery and Circuit Breaker', () => {
    beforeEach(() => {
      // Reset circuit breaker state for each test
      nftListener['circuitOpen'] = false;
      nftListener['failureCount'] = 0;
      auctionListener['circuitOpen'] = false;
      auctionListener['failureCount'] = 0;
    });

    it('should handle queue service failures with retry logic', async () => {
      mockQueueService.enqueue
        .mockRejectedValueOnce(new Error('Redis connection failed'))
        .mockRejectedValueOnce(new Error('Redis connection failed'))
        .mockResolvedValueOnce({ id: 'job-retry-success' });

      const event = {
        name: 'Transfer',
        data: { from: '0xabc', to: '0xdef', tokenId: '123' },
      };

      await nftListener['processEvent'](event);

      // Should have incremented failure count
      expect(nftListener['failureCount']).toBe(2);
    });

    it('should open circuit breaker after max failures', async () => {
      mockQueueService.enqueue.mockRejectedValue(
        new Error('Persistent failure'),
      );

      const event = {
        name: 'BidPlaced',
        data: { bidder: '0xaaa', amount: '1000', auctionId: '42' },
      };

      // Set lower threshold for testing
      auctionListener['maxFailures'] = 2;

      // Trigger failures
      await auctionListener['processEvent'](event);
      await auctionListener['processEvent'](event);

      expect(auctionListener['circuitOpen']).toBe(true);
    });

    it('should skip processing when circuit breaker is open', async () => {
      nftListener['circuitOpen'] = true;

      const event = {
        name: 'Transfer',
        data: { from: '0xabc', to: '0xdef', tokenId: '123' },
      };

      await nftListener['processEvent'](event);

      expect(mockQueueService.enqueue).not.toHaveBeenCalled();
      expect(mockEventsService.create).not.toHaveBeenCalled();
    });

    it('should reset circuit breaker after timeout', (done) => {
      auctionListener['circuitOpen'] = true;
      auctionListener['resetTimeout'] = 100; // 100ms for testing

      // Wait for circuit to reset
      setTimeout(() => {
        expect(auctionListener['circuitOpen']).toBe(false);
        expect(auctionListener['failureCount']).toBe(0);
        done();
      }, 150);
    });
  });

  describe('Event Validation', () => {
    describe('NFT Events', () => {
      it('should validate Transfer events correctly', () => {
        const validEvent = {
          name: 'Transfer',
          data: { from: '0xabc', to: '0xdef', tokenId: '123' },
        };
        expect(nftListener['validateEvent'](validEvent)).toBe(true);

        const invalidEvent = {
          name: 'Transfer',
          data: { from: '0xabc', to: '0xdef' }, // missing tokenId
        };
        expect(nftListener['validateEvent'](invalidEvent)).toBe(false);
      });

      it('should validate Approval events correctly', () => {
        const validEvent = {
          name: 'Approval',
          data: { owner: '0xabc', approved: '0xdef', tokenId: '123' },
        };
        expect(nftListener['validateEvent'](validEvent)).toBe(true);

        const invalidEvent = {
          name: 'Approval',
          data: { owner: '0xabc' }, // missing fields
        };
        expect(nftListener['validateEvent'](invalidEvent)).toBe(false);
      });
    });

    describe('Auction Events', () => {
      it('should validate BidPlaced events correctly', () => {
        const validEvent = {
          name: 'BidPlaced',
          data: { bidder: '0xaaa', amount: '1000', auctionId: '42' },
        };
        expect(auctionListener['validateEvent'](validEvent)).toBe(true);

        const invalidEvent = {
          name: 'BidPlaced',
          data: { bidder: '0xaaa', amount: '1000' }, // missing auctionId
        };
        expect(auctionListener['validateEvent'](invalidEvent)).toBe(false);
      });

      it('should validate AuctionCreated events correctly', () => {
        const validEvent = {
          name: 'AuctionCreated',
          data: {
            creator: '0xbbb',
            auctionId: '42',
            startPrice: '500',
            duration: '3600',
          },
        };
        expect(auctionListener['validateEvent'](validEvent)).toBe(true);
      });
    });

    describe('Transaction Events', () => {
      it('should validate TransactionProcessed events correctly', () => {
        const validEvent = {
          name: 'TransactionProcessed',
          data: { txHash: '0xdeadbeef', status: 'success' },
        };
        expect(transactionListener['validateEvent'](validEvent)).toBe(true);

        const invalidEvent = {
          name: 'TransactionProcessed',
          data: { txHash: '0xdeadbeef' }, // missing status
        };
        expect(transactionListener['validateEvent'](invalidEvent)).toBe(false);
      });

      it('should validate PaymentReceived events correctly', () => {
        const validEvent = {
          name: 'PaymentReceived',
          data: {
            from: '0xabc',
            to: '0xdef',
            amount: '1000',
            token: '0xtoken',
          },
        };
        expect(transactionListener['validateEvent'](validEvent)).toBe(true);
      });
    });
  });

  describe('Event Storage Integration', () => {
    it('should store processed events using EventsService', async () => {
      const event = {
        name: 'Transfer',
        data: { from: '0xabc', to: '0xdef', tokenId: '123' },
        blockNumber: 1000,
        transactionHash: '0xhash123',
      };

      await nftListener['processEvent'](event);

      expect(mockEventsService.create).toHaveBeenCalledWith({
        contractName: 'nft',
        eventName: 'Transfer',
        eventData: event.data,
        blockNumber: 1000,
        transactionHash: '0xhash123',
        timestamp: expect.any(Date),
      });
    });
  });

  describe('Health Checks', () => {
    it('should provide comprehensive health status', async () => {
      const health = await nftListener.healthCheck();

      expect(health).toMatchObject({
        isListening: expect.any(Boolean),
        lastProcessedBlock: expect.any(Number),
        circuitOpen: expect.any(Boolean),
        failureCount: expect.any(Number),
        performance: expect.objectContaining({
          avgProcessingTime: expect.any(Number),
          maxProcessingTime: expect.any(Number),
          eventsProcessed: expect.any(Number),
          slowEventsCount: expect.any(Number),
        }),
        contractAddress: expect.any(String),
        supportedEvents: expect.any(Array),
      });
    });
  });

  describe('Missed Event Recovery', () => {
    it('should recover missed events correctly', async () => {
      const fromBlock = 900;
      const toBlock = 1000;

      await nftListener['recoverMissedEvents'](fromBlock, toBlock);

      expect(mockProvider.getEvents).toHaveBeenCalledWith({
        from_block: { block_number: fromBlock },
        to_block: { block_number: toBlock },
        address: blockchainConfig.nftContractAddress,
        chunk_size: 100,
      });

      expect(nftListener['lastProcessedBlock']).toBe(toBlock);
    });

    it('should handle recovery failures gracefully', async () => {
      mockProvider.getEvents.mockRejectedValueOnce(new Error('Network error'));

      await expect(
        nftListener['recoverMissedEvents'](900, 1000),
      ).rejects.toThrow('Network error');
    });
  });

  describe('Concurrent Event Processing', () => {
    it('should handle multiple concurrent events', async () => {
      const events = Array.from({ length: 10 }, (_, i) => ({
        name: 'Transfer',
        data: { from: `0x${i}aa`, to: `0x${i}bb`, tokenId: `${i}` },
        blockNumber: 1000,
        transactionHash: '0xhash123',
      }));

      await Promise.all(events.map(event => nftListener['processEvent'](event)));

      expect(mockQueueService.enqueue).toHaveBeenCalledTimes(10);
      expect(mockEventsService.create).toHaveBeenCalledTimes(10);
    });
  });
});