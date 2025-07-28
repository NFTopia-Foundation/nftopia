
import { AuctionListener } from '../auction.listener';
import { QueueService } from '../../../redis/queue.service';
import { Job } from 'bullmq';

// Mock the QueueService properly
const mockQueueService: Partial<QueueService> = {
  enqueue: jest.fn(),
  // Add other required properties if needed for tests
};

// Mock StarkNet dependencies
jest.mock('starknet', () => ({
  RpcProvider: jest.fn().mockImplementation(() => ({
    getBlockWithTxHashes: jest.fn().mockResolvedValue({ block_number: 1000 }),
  })),
  Contract: jest.fn().mockImplementation(() => ({})),
}));

// Mock the blockchain config
jest.mock('../../../config/blockchain.config', () => ({
  blockchainConfig: {
    auctionContractAddress: '0x123',
    eventPollingInterval: 5000,
  },
}));

describe('AuctionListener', () => {
  let listener: AuctionListener;

  beforeEach(() => {
    // Create mock job
    const mockJob: Partial<Job> = {
      id: 'job-123',
      name: 'test-job',
      data: {},
    };

    mockQueueService.enqueue = jest.fn().mockResolvedValue(mockJob);

    listener = new AuctionListener(mockQueueService as QueueService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize and be defined', () => {
    expect(listener).toBeDefined();
  });

  it('should validate a correct BidPlaced event', () => {
    const event = {
      name: 'BidPlaced',
      data: { bidder: '0xaaa', amount: '1000', auctionId: '42' },
    };
    expect(listener['validateEvent'](event)).toBe(true);
  });

  it('should reject an invalid BidPlaced event', () => {
    const event = {
      name: 'BidPlaced',
      data: { bidder: '0xaaa', amount: '1000' }, // missing auctionId
    };
    expect(listener['validateEvent'](event)).toBe(false);
  });

  it('should validate a correct AuctionCreated event', () => {
    const event = {
      name: 'AuctionCreated',
      data: {
        creator: '0xbbb',
        auctionId: '42',
        startPrice: '500',
        duration: '3600',
      },
    };
    expect(listener['validateEvent'](event)).toBe(true);
  });

  it('should reset failure count on successful event', async () => {
    const event = {
      name: 'BidPlaced',
      data: { bidder: '0xaaa', amount: '1000', auctionId: '42' },
    };

    listener['failureCount'] = 2;
    await listener['processEvent'](event);
    expect(listener['failureCount']).toBe(0);
  });

  it('should open circuit breaker after max failures', async () => {
    const badEvent = {
      name: 'BidPlaced',
      data: { bidder: '0xaaa' }, // invalid event
    };

    // Mock the enqueue to fail
    mockQueueService.enqueue = jest
      .fn()
      .mockRejectedValue(new Error('Queue error'));

    listener['maxFailures'] = 2;

    // Process the same failing event twice
    await listener['processEvent'](badEvent);
    await listener['processEvent'](badEvent);

    expect(listener['circuitOpen']).toBe(true);
  });

  it('should skip processing when circuit breaker is open', async () => {
    listener['circuitOpen'] = true;

    const spy = jest.spyOn(listener as any, 'handleEvent');

    await listener['processEvent']({
      name: 'BidPlaced',
      data: { bidder: '0xaaa', amount: '1000', auctionId: '42' },
    });

    expect(spy).not.toHaveBeenCalled();
    expect(mockQueueService.enqueue).not.toHaveBeenCalled();
  });

  it('should reset circuit breaker after timeout', (done) => {
    listener['circuitOpen'] = true;
    listener['resetTimeout'] = 100; // 100ms for testing

    // Wait for circuit to reset
    setTimeout(() => {
      expect(listener['circuitOpen']).toBe(false);
      expect(listener['failureCount']).toBe(0);
      done();
    }, 150);
  });

  it('should handle concurrent event processing', async () => {
    const events = Array.from({ length: 5 }, (_, i) => ({
      name: 'BidPlaced',
      data: { bidder: `0x${i}`, amount: '1000', auctionId: `${i}` },
    }));

    await Promise.all(events.map((event) => listener['processEvent'](event)));

    expect(mockQueueService.enqueue).toHaveBeenCalledTimes(5);
  });

  it('should provide health check information', async () => {
    const health = await listener.healthCheck();

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
      supportedEvents: expect.arrayContaining([
        'BidPlaced',
        'AuctionCreated',
        'AuctionEnded',
      ]),
    });
  });

  it('should track performance metrics', async () => {
    const event = {
      name: 'BidPlaced',
      data: { bidder: '0xaaa', amount: '1000', auctionId: '42' },
    };

    // Process multiple events
    for (let i = 0; i < 3; i++) {
      await listener['processEvent'](event);
    }

    const metrics = listener.getPerformanceMetrics();
    expect(metrics.eventsProcessed).toBe(3);
    expect(metrics.avgProcessingTime).toBeGreaterThan(0);
  });

  it('should handle unknown event types gracefully', () => {
    const unknownEvent = {
      name: 'UnknownEvent',
      data: { someField: 'value' },
    };

    // Should return true for unknown events (with warning)
    expect(listener['validateEvent'](unknownEvent)).toBe(true);
  });
});
