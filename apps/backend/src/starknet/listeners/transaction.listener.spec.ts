import { TransactionListener } from './transaction.listener';
import { QueueService } from '../../redis/queue.service';

describe('TransactionListener', () => {
  let listener: TransactionListener;
  let mockQueueService: Partial<QueueService>;

  beforeEach(() => {
    mockQueueService = { enqueue: jest.fn() };
    listener = new TransactionListener(mockQueueService as QueueService);
  });

  it('should initialize and be defined', () => {
    expect(listener).toBeDefined();
  });

  it('should validate a correct TransactionProcessed event', () => {
    const event = { name: 'TransactionProcessed', data: { txHash: '0xdeadbeef', status: 'success' } };
    expect(listener['validateEvent'](event)).toBe(true);
  });

  it('should reject an invalid TransactionProcessed event', () => {
    const event = { name: 'TransactionProcessed', data: { txHash: '0xdeadbeef' } };
    expect(listener['validateEvent'](event)).toBe(false);
  });

  it('should reset failure count on successful event', async () => {
    const event = { name: 'TransactionProcessed', data: { txHash: '0xdeadbeef', status: 'success' } };
    listener['failureCount'] = 2;
    await listener['processEvent'](event);
    expect(listener['failureCount']).toBe(0);
  });

  it('should open circuit breaker after max failures', async () => {
    const badEvent = { name: 'TransactionProcessed', data: { txHash: '0xdeadbeef' } };
    listener['maxFailures'] = 2;
    await listener['processEvent'](badEvent);
    await listener['processEvent'](badEvent);
    expect(listener['circuitOpen']).toBe(true);
  });

  it('should skip processing when circuit breaker is open', async () => {
    listener['circuitOpen'] = true;
    const spy = jest.spyOn(listener as any, 'handleEvent');
    await listener['processEvent']({ name: 'TransactionProcessed', data: { txHash: '0xdeadbeef', status: 'success' } });
    expect(listener['circuitOpen']).toBe(true);
  });
}); 