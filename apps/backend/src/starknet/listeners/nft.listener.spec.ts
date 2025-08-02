import { NftListener } from './nft.listener';
import { QueueService } from '../../redis/queue.service';

describe('NftListener', () => {
  let listener: NftListener;
  let mockQueueService: Partial<QueueService>;

  beforeEach(() => {
    mockQueueService = { enqueue: jest.fn() };
    listener = new NftListener(mockQueueService as QueueService);
  });

  it('should initialize and be defined', () => {
    expect(listener).toBeDefined();
  });

  it('should validate a correct Transfer event', () => {
    const event = { name: 'Transfer', data: { from: '0xabc', to: '0xdef', tokenId: '123' } };
    expect(listener['validateEvent'](event)).toBe(true);
  });

  it('should reject an invalid Transfer event', () => {
    const event = { name: 'Transfer', data: { from: '0xabc', to: '0xdef' } };
    expect(listener['validateEvent'](event)).toBe(false);
  });

  it('should reset failure count on successful event', async () => {
    const event = { name: 'Transfer', data: { from: '0xabc', to: '0xdef', tokenId: '123' } };
    // Simulate error then success
    listener['failureCount'] = 2;
    await listener['processEvent'](event);
    expect(listener['failureCount']).toBe(0);
  });

  it('should open circuit breaker after max failures', async () => {
    const badEvent = { name: 'Transfer', data: { from: '0xabc' } };
    listener['maxFailures'] = 2;
    await listener['processEvent'](badEvent);
    await listener['processEvent'](badEvent);
    expect(listener['circuitOpen']).toBe(true);
  });

  it('should skip processing when circuit breaker is open', async () => {
    listener['circuitOpen'] = true;
    const spy = jest.spyOn(listener as any, 'handleEvent');
    await listener['processEvent']({ name: 'Transfer', data: { from: '0xabc', to: '0xdef', tokenId: '123' } });
    expect(spy).not.toHaveBeenCalled();
  });
}); 