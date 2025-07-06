import { NotificationRepository } from '../repositories/notification.repository';
import { Notification } from '../models/notification.model';
import { connect, disconnect } from '../config/database';

describe('Notification Repository', () => {
  beforeAll(async () => {
    await connect();
  });

  afterAll(async () => {
    await disconnect();
  });

  afterEach(async () => {
    await Notification.deleteMany({});
  });

  describe('create', () => {
    it('should create a new notification', async () => {
      const repo = new NotificationRepository();
      const notification = await repo.create({
        userId: 'user123',
        type: 'sms',
        content: 'Test notification'
      });
      
      expect(notification).toHaveProperty('_id');
      expect(notification.userId).toBe('user123');
    });
  });

  // Add tests for all other repository methods
});