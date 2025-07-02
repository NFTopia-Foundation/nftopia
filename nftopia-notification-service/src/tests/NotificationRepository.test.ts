import { NotificationRepository } from '../repositories/NotificationRepository';
import { Notification } from '../models/Notification';
import mongoose from 'mongoose';

// Mock the Notification model
jest.mock('../models/Notification');

// Type the mocked Notification
const MockedNotification = Notification as jest.Mocked<typeof Notification>;

describe('NotificationRepository Unit Tests', () => {
  let repository: NotificationRepository;

  beforeEach(() => {
    repository = new NotificationRepository();
    jest.clearAllMocks();
  });

  describe('create()', () => {
    it('should successfully create a notification', async () => {
      const mockNotification = {
        _id: new mongoose.Types.ObjectId(),
        userId: 'user123',
        type: 'email' as const,
        status: 'pending' as const,
        content: 'Test',
        recipient: 'test@example.com',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      MockedNotification.create = jest.fn().mockResolvedValue(mockNotification);

      const result = await repository.create({
        userId: 'user123',
        type: 'email',
        content: 'Test',
        recipient: 'test@example.com'
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockNotification);
    });

    it('should handle creation errors', async () => {
      MockedNotification.create = jest.fn().mockRejectedValue(new Error('DB error'));

      const result = await repository.create({
        userId: 'user123',
        type: 'email',
        content: 'Test',
        recipient: 'test@example.com'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Notification creation failed');
    });
  });

  describe('findById()', () => {
    it('should find notification by ID', async () => {
      const mockNotification = {
        _id: new mongoose.Types.ObjectId(),
        userId: 'user123'
      };

      MockedNotification.findById = jest.fn().mockResolvedValue(mockNotification);

      const result = await repository.findById('507f1f77bcf86cd799439011');
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockNotification);
    });

    it('should handle not found', async () => {
      MockedNotification.findById = jest.fn().mockResolvedValue(null);

      const result = await repository.findById('invalid-id');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Notification not found');
    });
  });

  describe('updateStatus()', () => {
    it('should update status successfully', async () => {
      const mockResult = { modifiedCount: 1 };
      MockedNotification.updateOne = jest.fn().mockResolvedValue(mockResult);

      const result = await repository.updateStatus('507f1f77bcf86cd799439011', 'sent');
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockResult);
    });

    it('should handle update errors', async () => {
      MockedNotification.updateOne = jest.fn().mockRejectedValue(new Error('DB error'));

      const result = await repository.updateStatus('invalid-id', 'sent');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Database update failed');
    });
  });

  describe('bulkUpdateStatus()', () => {
    it('should update multiple notifications', async () => {
      const mockResult = { modifiedCount: 2 };
      MockedNotification.updateMany = jest.fn().mockResolvedValue(mockResult);

      const result = await repository.bulkUpdateStatus(
        ['507f1f77bcf86cd799439011', '507f1f77bcf86cd799439012'],
        'failed'
      );
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockResult);
    });
  });

  describe('findByUserId()', () => {
    it('should return paginated results', async () => {
      const mockNotifications = [
        { _id: new mongoose.Types.ObjectId(), userId: 'user123' },
        { _id: new mongoose.Types.ObjectId(), userId: 'user123' }
      ];

      const mockQuery = {
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockNotifications)
      };

      MockedNotification.find = jest.fn().mockReturnValue(mockQuery);

      const result = await repository.findByUserId('user123', {
        page: 1,
        perPage: 10
      });
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockNotifications);
      expect(mockQuery.skip).toHaveBeenCalledWith(0);
      expect(mockQuery.limit).toHaveBeenCalledWith(10);
    });
  });
});
