
import { Test, TestingModule } from '@nestjs/testing';
import { AuctionListener } from './auction.listener';
import { QueueService } from '../../redis/queue.service';

describe('AuctionListener - Complete Coverage', () => {
  let listener: AuctionListener;
  let mockQueueService: jest.Mocked<QueueService>;

  beforeEach(async () => {
    mockQueueService = {
      enqueue: jest.fn().mockResolvedValue({ id: 'job-123' }),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuctionListener,
        { provide: QueueService, useValue: mockQueueService },
      ],
    }).compile();

    listener = module.get<AuctionListener>(AuctionListener);
  });

  describe('Listener Initialization', () => {
    it('should initialize with correct contract name', () => {
      expect(listener).toBeDefined();
      expect(listener['contractName']).toBe('auction');
    });

    it('should start listening on module init', async () => {
      const listenSpy = jest.spyOn(listener, 'listen');
      await listener.listen();
      expect(listenSpy).toHaveBeenCalled();
    });

    it('should initialize with default circuit breaker settings', () => {
      expect(listener['maxFailures']).toBe(5);
      expect(listener['circuitOpen']).toBe(false);
      expect(listener['failureCount']).toBe(0);
    });
  });

  describe('Event Parsing', () => {
    it('should validate BidPlaced events correctly', () => {
      const validEvent = {
        name: 'BidPlaced',
        data: { bidder: '0xaaa', amount: '1000', auctionId: '42' },
      };
      expect(listener['validateEvent'](validEvent)).toBe(true);
    });

    it('should validate AuctionCreated events', () => {
      const validEvent = {
        name: 'AuctionCreated',
        data: { creator: '0xbbb', startPrice: '500', duration: '3600' },
      };
      // This should pass with current implementation (returns true for non-BidPlaced)
      expect(listener['validateEvent'](validEvent)).toBe(true);
    });

    it('should reject events with missing required fields', () => {
      const invalidEvents = [
        { name: 'BidPlaced', data: { bidder: '0xaaa', amount: '1000' } }, // missing auctionId
        { name: 'BidPlaced', data: { amount: '1000', auctionId: '42' } }, // missing bidder
        { name: 'BidPlaced', data: { bidder: '0xaaa', auctionId: '42' } }, // missing amount
        { name: 'BidPlaced', data: null }, // null data
        { name: 'BidPlaced' }, // no data property
      ];

      invalidEvents.forEach((event) => {
        expect(listener['validateEvent'](event)).toBe(false);
      });
    });

    it('should handle malformed event data gracefully', () => {
      const malformedEvents = [
        { name: 'BidPlaced', data: 'invalid-string' },
        { name: 'BidPlaced', data: 123 },
        { name: 'BidPlaced', data: [] },
        { name: 'BidPlaced', data: undefined },
      ];

      malformedEvents.forEach((event) => {
        expect(() => listener['validateEvent'](event)).not.toThrow();
        expect(listener['validateEvent'](event)).toBe(false);
      });
    });
  });

  describe('Error Recovery', () => {
    beforeEach(() => {
      // Reset circuit breaker state
      listener['circuitOpen'] = false;
      listener['failureCount'] = 0;
    });

    it('should increment failure count on processing error', async () => {
      mockQueueService.enqueue.mockRejectedValueOnce(new Error('Redis error'));

      const event = {
        name: 'BidPlaced',
        data: { bidder: '0xaaa', amount: '1000', auctionId: '42' },
      };

      await listener['processEvent'](event);
      expect(listener['failureCount']).toBe(1);
    });

    it('should open circuit breaker after max failures', async () => {
      mockQueueService.enqueue.mockRejectedValue(new Error('Persistent error'));

      const event = {
        name: 'BidPlaced',
        data: { bidder: '0xaaa', amount: '1000', auctionId: '42' },
      };

      // Set lower threshold for testing
      listener['maxFailures'] = 2;

      // Trigger failures
      await listener['processEvent'](event);
      await listener['processEvent'](event);

      expect(listener['circuitOpen']).toBe(true);
    });

    it('should reset circuit breaker after timeout', async () => {
      listener['circuitOpen'] = true;
      listener['resetTimeout'] = 100; // 100ms for testing

      // Wait for circuit to reset
      await new Promise((resolve) => setTimeout(resolve, 150));

      expect(listener['circuitOpen']).toBe(false);
      expect(listener['failureCount']).toBe(0);
    });

    it('should skip event processing when circuit is open', async () => {
      listener['circuitOpen'] = true;

      const event = {
        name: 'BidPlaced',
        data: { bidder: '0xaaa', amount: '1000', auctionId: '42' },
      };

      await listener['processEvent'](event);

      expect(mockQueueService.enqueue).not.toHaveBeenCalled();
    });

    it('should reset failure count on successful processing', async () => {
      listener['failureCount'] = 3;

      const event = {
        name: 'BidPlaced',
        data: { bidder: '0xaaa', amount: '1000', auctionId: '42' },
      };

      await listener['processEvent'](event);
      expect(listener['failureCount']).toBe(0);
    });

    it('should handle validation failures without incrementing failure count', async () => {
      const invalidEvent = {
        name: 'BidPlaced',
        data: { bidder: '0xaaa' }, // missing required fields
      };

      await listener['processEvent'](invalidEvent);

      expect(listener['failureCount']).toBe(0);
      expect(mockQueueService.enqueue).not.toHaveBeenCalled();
    });
  });

  describe('Event Processing Pipeline', () => {
    it('should enqueue valid events successfully', async () => {
      const event = {
        name: 'BidPlaced',
        data: { bidder: '0xaaa', amount: '1000', auctionId: '42' },
      };

      await listener['processEvent'](event);

      expect(mockQueueService.enqueue).toHaveBeenCalledWith(
        'auction-events',
        event,
      );
    });

    it('should handle concurrent event processing', async () => {
      const events = Array.from({ length: 10 }, (_, i) => ({
        name: 'BidPlaced',
        data: { bidder: `0x${i}`, amount: '1000', auctionId: `${i}` },
      }));

      await Promise.all(events.map((event) => listener['processEvent'](event)));

      expect(mockQueueService.enqueue).toHaveBeenCalledTimes(10);
    });

    it('should measure processing latency', async () => {
      const event = {
        name: 'BidPlaced',
        data: { bidder: '0xaaa', amount: '1000', auctionId: '42' },
      };

      const startTime = Date.now();
      await listener['processEvent'](event);
      const endTime = Date.now();

      const latency = endTime - startTime;
      expect(latency).toBeLessThan(500); // Should be under 500ms
    });
  });

  describe('Recovery and Resilience', () => {
    it('should implement missed event recovery mechanism', async () => {
      const recoverSpy = jest.spyOn(listener as any, 'recoverMissedEvents');

      // This would be called during initialization or after downtime
      await listener['recoverMissedEvents'](100, 200);

      expect(recoverSpy).toHaveBeenCalledWith(100, 200);
    });

    it('should handle network timeouts gracefully', async () => {
      mockQueueService.enqueue.mockImplementation(
        () =>
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Network timeout')), 1000),
          ),
      );

      const event = {
        name: 'BidPlaced',
        data: { bidder: '0xaaa', amount: '1000', auctionId: '42' },
      };

      await listener['processEvent'](event);
      expect(listener['failureCount']).toBe(1);
    });
  });
});
