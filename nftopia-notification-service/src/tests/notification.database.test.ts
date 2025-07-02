import { database } from '../config/database';
import { Notification } from '../models/Notification';
import { NotificationStorageService } from '../services/NotificationStorageService';
import { NotificationIndexes } from '../utils/dbIndexes';
import mongoose from 'mongoose';

describe('Database Integration Tests', () => {
  let storageService: NotificationStorageService;

  beforeAll(async () => {
    // Connect to test database
    await database.connect();
    await NotificationIndexes.createIndexes();
    storageService = new NotificationStorageService();
  });

  afterAll(async () => {
    // Clean up
    await Notification.deleteMany({});
    await database.disconnect();
  });

  beforeEach(async () => {
    await Notification.deleteMany({});
  });

  describe('Database Connection', () => {
    it('should establish database connection', () => {
      const connection = database.getConnection();
      expect(connection).toBeInstanceOf(mongoose.Connection);
      expect(connection.readyState).toBe(1); // 1 = connected
    });
  });

  describe('Notification Storage', () => {
    const testNotification = {
      userId: 'user123',
      type: 'email' as const,
      content: 'Test content',
      recipient: 'test@example.com'
    };

    it('should create and retrieve notification', async () => {
      // Test creation
      const { success, data: created } = await storageService.createAndSendNotification(testNotification);
      expect(success).toBe(true);
      expect(created).toMatchObject(testNotification);

      // Test retrieval
      const { success: findSuccess, data: found } = await storageService.getNotifications({
        userId: 'user123'
      });
     
      expect(findSuccess).toBe(true);
      expect(found).toHaveLength(1);
      if (found && found.length > 0 && created) {
        expect(found[0]._id).toEqual(created._id);
      }
    });

    it('should update notification status', async () => {
      const { data: created } = await storageService.createAndSendNotification(testNotification);
      
      if (!created) {
        throw new Error('Failed to create notification');
      }

      const updateResult = await storageService.updateStatus(created._id.toString(), 'sent');
     
      expect(updateResult.success).toBe(true);
      expect(updateResult.data?.modifiedCount).toBe(1);

      // Verify update
      const { data: updated } = await storageService.getNotifications({
        userId: 'user123',
        status: 'sent'
      });
     
      expect(updated).toHaveLength(1);
    });

    it('should query by date range', async () => {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 86400000);
     
      // Create test data
      await storageService.createAndSendNotification({
        ...testNotification,
        createdAt: yesterday
      });
     
      await storageService.createAndSendNotification(testNotification);

      // Query
      const { data: recent } = await storageService.getNotificationsByDateRange(
        now,
        new Date()
      );
     
      expect(recent).toHaveLength(1);
    });
  });

  describe('Indexes', () => {
    it('should have proper indexes created', async () => {
      const indexes = await Notification.collection.indexes();
      const indexNames = indexes.map((i: any) => i.name);
     
      expect(indexNames).toContain('user_status_idx');
      expect(indexNames).toContain('type_status_time_idx');
      expect(indexNames).toContain('user_type_time_idx');
    });
  });
});
