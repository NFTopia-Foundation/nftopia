
import { NftListener } from '../nft.listener';
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
    nftContractAddress: '0x123',
    eventPollingInterval: 5000,
  },
}));

describe('NftListener', () => {
  let listener: NftListener;

  beforeEach(() => {
    // Create mock job
    const mockJob: Partial<Job> = {
      id: 'job-123',
      name: 'test-job',
      data: {},
    };

    mockQueueService.enqueue = jest.fn().mockResolvedValue(mockJob);

    listener = new NftListener(mockQueueService as QueueService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize and be defined', () => {
    expect(listener).toBeDefined();
  });

  it('should validate a correct Transfer event', () => {
    const event = {
      name: 'Transfer',
      data: { from: '0xabc', to: '0xdef', tokenId: '123' },
    };
    expect(listener['validateEvent'](event)).toBe(true);
  });

  it('should reject an invalid Transfer event', () => {
    const event = {
      name: 'Transfer',
      data: { from: '0xabc', to: '0xdef' }, // missing tokenId
    };
    expect(listener['validateEvent'](event)).toBe(false);
  });

  it('should validate a correct Approval event', () => {
    const event = {
      name: 'Approval',
      data: { owner: '0xabc', approved: '0xdef', tokenId: '123' },
    };
    expect(listener['validateEvent'](event)).toBe(true);
  });

  it('should validate a correct ApprovalForAll event', () => {
    const event = {
      name: 'ApprovalForAll',
      data: { owner: '0xabc', operator: '0xdef', approved: true },
    };
    expect(listener['validateEvent'](event)).toBe(true);
  });

  it('should reset failure count on successful event', async () => {
    const event = {
      name: 'Transfer',
      data: { from: '0xabc', to: '0xdef', tokenId: '123' },
    };

    listener['failureCount'] = 2;
    await listener['processEvent'](event);
    expect(listener['failureCount']).toBe(0);
  });

  it('should open circuit breaker after max failures', async () => {
    // Mock the enqueue to fail
    mockQueueService.enqueue = jest
      .fn()
      .mockRejectedValue(new Error('Queue error'));

    const event = {
      name: 'Transfer',
      data: { from: '0xabc', to: '0xdef', tokenId: '123' },
    };

    listener['maxFailures'] = 2;

    // Process the same event twice with failures
    await listener['processEvent'](event);
    await listener['processEvent'](event);

    expect(listener['circuitOpen']).toBe(true);
  });

  it('should skip processing when circuit breaker is open', async () => {
    listener['circuitOpen'] = true;

    const spy = jest.spyOn(listener as any, 'handleEvent');

    await listener['processEvent']({
      name: 'Transfer',
      data: { from: '0xabc', to: '0xdef', tokenId: '123' },
    });

    expect(spy).not.toHaveBeenCalled();
    expect(mockQueueService.enqueue).not.toHaveBeenCalled();
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
        'Transfer',
        'Approval',
        'ApprovalForAll',
      ]),
    });
  });

  it('should handle unknown event types gracefully', () => {
    const unknownEvent = {
      name: 'UnknownEvent',
      data: { someField: 'value' },
    };

    // Should return true for unknown events (with warning)
    expect(listener['validateEvent'](unknownEvent)).toBe(true);
  });

  it('should process multiple event types correctly', async () => {
    const events = [
      {
        name: 'Transfer',
        data: { from: '0xabc', to: '0xdef', tokenId: '123' },
      },
      {
        name: 'Approval',
        data: { owner: '0xabc', approved: '0xdef', tokenId: '123' },
      },
      {
        name: 'ApprovalForAll',
        data: { owner: '0xabc', operator: '0xdef', approved: true },
      },
    ];

    for (const event of events) {
      await listener['processEvent'](event);
    }

    expect(mockQueueService.enqueue).toHaveBeenCalledTimes(3);

    // Check that different queue names are used for different event types
    expect(mockQueueService.enqueue).toHaveBeenCalledWith(
      'nft-transfer-processing',
      expect.any(Object),
    );
    expect(mockQueueService.enqueue).toHaveBeenCalledWith(
      'nft-approval-processing',
      expect.any(Object),
    );
    expect(mockQueueService.enqueue).toHaveBeenCalledWith(
      'nft-approval-all-processing',
      expect.any(Object),
    );
  });
});
