import mongoose from 'mongoose';
import Notification, { INotification } from '../models/Notification';

// Test database connection
beforeAll(async () => {
  const testDbUri = process.env.MONGO_TEST_URI || 'mongodb://localhost:27017/nftopia-notifications-test';
  await mongoose.connect(testDbUri);
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
});

beforeEach(async () => {
  await Notification.deleteMany({});
});

describe('Notification Schema', () => {
  describe('Required Fields Validation', () => {
    it('should create a notification with all required fields', async () => {
      const notificationData = {
        userId: 'user123',
        type: 'mint' as const,
        content: 'Your NFT has been minted successfully!',
        channels: ['email', 'push'] as const
      };

      const notification = new Notification(notificationData);
      const savedNotification = await notification.save();

      expect(savedNotification.userId).toBe(notificationData.userId);
      expect(savedNotification.type).toBe(notificationData.type);
      expect(savedNotification.content).toBe(notificationData.content);
      expect(savedNotification.channels).toEqual(notificationData.channels);
      expect(savedNotification.status).toBe('pending');
      expect(savedNotification.retryCount).toBe(0);
      expect(savedNotification.maxRetries).toBe(3);
    });

    it('should fail when userId is missing', async () => {
      const notificationData = {
        type: 'mint' as const,
        content: 'Your NFT has been minted successfully!',
        channels: ['email'] as const
      };

      const notification = new Notification(notificationData);
      await expect(notification.save()).rejects.toThrow('User ID is required');
    });

    it('should fail when type is missing', async () => {
      const notificationData = {
        userId: 'user123',
        content: 'Your NFT has been minted successfully!',
        channels: ['email'] as const
      };

      const notification = new Notification(notificationData);
      await expect(notification.save()).rejects.toThrow('Notification type is required');
    });

    it('should fail when content is missing', async () => {
      const notificationData = {
        userId: 'user123',
        type: 'mint' as const,
        channels: ['email'] as const
      };

      const notification = new Notification(notificationData);
      await expect(notification.save()).rejects.toThrow('Notification content is required');
    });

    it('should fail when channels array is empty', async () => {
      const notificationData = {
        userId: 'user123',
        type: 'mint' as const,
        content: 'Your NFT has been minted successfully!',
        channels: []
      };

      const notification = new Notification(notificationData);
      await expect(notification.save()).rejects.toThrow('At least one notification channel must be specified');
    });
  });

  describe('Enum Validation', () => {
    it('should accept valid notification types', async () => {
      const validTypes = ['mint', 'bid', 'sale', 'auction', 'admin'];
      
      for (const type of validTypes) {
        const notificationData = {
          userId: 'user123',
          type: type as any,
          content: `Test notification for ${type}`,
          channels: ['email'] as const
        };

        const notification = new Notification(notificationData);
        const savedNotification = await notification.save();
        expect(savedNotification.type).toBe(type);
      }
    });

    it('should reject invalid notification types', async () => {
      const notificationData = {
        userId: 'user123',
        type: 'invalid-type',
        content: 'Test notification',
        channels: ['email'] as const
      };

      const notification = new Notification(notificationData);
      await expect(notification.save()).rejects.toThrow('Notification type must be one of: mint, bid, sale, auction, admin');
    });

    it('should accept valid status values', async () => {
      const validStatuses = ['pending', 'sent', 'failed', 'read'];
      
      for (const status of validStatuses) {
        const notificationData = {
          userId: 'user123',
          type: 'mint' as const,
          content: 'Test notification',
          channels: ['email'] as const,
          status: status as any
        };

        const notification = new Notification(notificationData);
        const savedNotification = await notification.save();
        expect(savedNotification.status).toBe(status);
      }
    });

    it('should reject invalid status values', async () => {
      const notificationData = {
        userId: 'user123',
        type: 'mint' as const,
        content: 'Test notification',
        channels: ['email'] as const,
        status: 'invalid-status'
      };

      const notification = new Notification(notificationData);
      await expect(notification.save()).rejects.toThrow('Status must be one of: pending, sent, failed, read');
    });

    it('should accept valid channel types', async () => {
      const validChannels = ['email', 'sms', 'push', 'in-app'];
      
      for (const channel of validChannels) {
        const notificationData = {
          userId: 'user123',
          type: 'mint' as const,
          content: 'Test notification',
          channels: [channel] as any
        };

        const notification = new Notification(notificationData);
        const savedNotification = await notification.save();
        expect(savedNotification.channels).toContain(channel);
      }
    });

    it('should reject invalid channel types', async () => {
      const notificationData = {
        userId: 'user123',
        type: 'mint' as const,
        content: 'Test notification',
        channels: ['invalid-channel']
      };

      const notification = new Notification(notificationData);
      await expect(notification.save()).rejects.toThrow('Channel must be one of: email, sms, push, in-app');
    });
  });

  describe('Content Validation', () => {
    it('should reject empty content', async () => {
      const notificationData = {
        userId: 'user123',
        type: 'mint' as const,
        content: '',
        channels: ['email'] as const
      };

      const notification = new Notification(notificationData);
      await expect(notification.save()).rejects.toThrow('Content must be between 1 and 1000 characters');
    });

    it('should reject content longer than 1000 characters', async () => {
      const longContent = 'a'.repeat(1001);
      const notificationData = {
        userId: 'user123',
        type: 'mint' as const,
        content: longContent,
        channels: ['email'] as const
      };

      const notification = new Notification(notificationData);
      await expect(notification.save()).rejects.toThrow('Content must be between 1 and 1000 characters');
    });

    it('should accept content with exactly 1000 characters', async () => {
      const content = 'a'.repeat(1000);
      const notificationData = {
        userId: 'user123',
        type: 'mint' as const,
        content: content,
        channels: ['email'] as const
      };

      const notification = new Notification(notificationData);
      const savedNotification = await notification.save();
      expect(savedNotification.content).toBe(content);
    });
  });

  describe('Metadata Validation', () => {
    it('should accept valid transaction hash', async () => {
      const validTxHash = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
      const notificationData = {
        userId: 'user123',
        type: 'mint' as const,
        content: 'Test notification',
        channels: ['email'] as const,
        metadata: {
          txHash: validTxHash
        }
      };

      const notification = new Notification(notificationData);
      const savedNotification = await notification.save();
      expect(savedNotification.metadata?.txHash).toBe(validTxHash);
    });

    it('should reject invalid transaction hash', async () => {
      const invalidTxHash = 'invalid-hash';
      const notificationData = {
        userId: 'user123',
        type: 'mint' as const,
        content: 'Test notification',
        channels: ['email'] as const,
        metadata: {
          txHash: invalidTxHash
        }
      };

      const notification = new Notification(notificationData);
      await expect(notification.save()).rejects.toThrow('Transaction hash must be a valid 64-character hex string starting with 0x');
    });

    it('should require collection when nftId is provided', async () => {
      const notificationData = {
        userId: 'user123',
        type: 'mint' as const,
        content: 'Test notification',
        channels: ['email'] as const,
        metadata: {
          nftId: 'nft123'
          // Missing collection
        }
      };

      const notification = new Notification(notificationData);
      await expect(notification.save()).rejects.toThrow('Collection name is required when NFT ID is provided');
    });

    it('should accept metadata with both nftId and collection', async () => {
      const notificationData = {
        userId: 'user123',
        type: 'mint' as const,
        content: 'Test notification',
        channels: ['email'] as const,
        metadata: {
          nftId: 'nft123',
          collection: 'Cool Collection'
        }
      };

      const notification = new Notification(notificationData);
      const savedNotification = await notification.save();
      expect(savedNotification.metadata?.nftId).toBe('nft123');
      expect(savedNotification.metadata?.collection).toBe('Cool Collection');
    });
  });

  describe('Instance Methods', () => {
    let notification: INotification;

    beforeEach(async () => {
      const notificationData = {
        userId: 'user123',
        type: 'mint' as const,
        content: 'Test notification',
        channels: ['email'] as const
      };
      notification = await new Notification(notificationData).save();
    });

    it('should mark notification as read', async () => {
      await notification.markAsRead();
      
      expect(notification.status).toBe('read');
      expect(notification.readAt).toBeInstanceOf(Date);
    });

    it('should mark notification as sent', async () => {
      await notification.markAsSent();
      
      expect(notification.status).toBe('sent');
      expect(notification.sentAt).toBeInstanceOf(Date);
    });

    it('should mark notification as failed and increment retry count', async () => {
      const initialRetryCount = notification.retryCount;
      await notification.markAsFailed();
      
      expect(notification.status).toBe('failed');
      expect(notification.failedAt).toBeInstanceOf(Date);
      expect(notification.retryCount).toBe(initialRetryCount + 1);
    });

    it('should check if notification can be retried', async () => {
      // Initially should not be able to retry (status is pending)
      expect(notification.canRetry()).toBe(false);

      // Mark as failed
      await notification.markAsFailed();
      expect(notification.canRetry()).toBe(true);

      // Exceed max retries
      notification.retryCount = notification.maxRetries;
      expect(notification.canRetry()).toBe(false);
    });
  });

  describe('Static Methods', () => {
    beforeEach(async () => {
      // Create test notifications
      const notifications = [
        {
          userId: 'user1',
          type: 'mint' as const,
          content: 'NFT minted',
          channels: ['email'] as const,
          status: 'pending' as const
        },
        {
          userId: 'user1',
          type: 'bid' as const,
          content: 'Bid placed',
          channels: ['push'] as const,
          status: 'sent' as const
        },
        {
          userId: 'user2',
          type: 'sale' as const,
          content: 'NFT sold',
          channels: ['email', 'sms'] as const,
          status: 'read' as const
        }
      ];

      await Notification.insertMany(notifications);
    });

    it('should find notifications by user', async () => {
      const userNotifications = await Notification.findByUser('user1');
      
      expect(userNotifications).toHaveLength(2);
      expect(userNotifications[0].userId).toBe('user1');
      expect(userNotifications[1].userId).toBe('user1');
    });

    it('should find pending notifications', async () => {
      const pendingNotifications = await Notification.findPending();
      
      expect(pendingNotifications).toHaveLength(1);
      expect(pendingNotifications[0].status).toBe('pending');
    });

    it('should find notifications by type', async () => {
      const mintNotifications = await Notification.findByType('mint');
      
      expect(mintNotifications).toHaveLength(1);
      expect(mintNotifications[0].type).toBe('mint');
    });

    it('should find notifications by NFT ID', async () => {
      // Create notification with NFT metadata
      const nftNotification = await new Notification({
        userId: 'user1',
        type: 'mint' as const,
        content: 'NFT minted',
        channels: ['email'] as const,
        metadata: {
          nftId: 'nft123',
          collection: 'Test Collection'
        }
      }).save();

      const nftNotifications = await Notification.findByNFT('nft123');
      
      expect(nftNotifications).toHaveLength(1);
      expect(nftNotifications[0].metadata?.nftId).toBe('nft123');
    });
  });

  describe('Timestamps', () => {
    it('should automatically add createdAt and updatedAt', async () => {
      const notificationData = {
        userId: 'user123',
        type: 'mint' as const,
        content: 'Test notification',
        channels: ['email'] as const
      };

      const notification = await new Notification(notificationData).save();
      
      expect(notification.createdAt).toBeInstanceOf(Date);
      expect(notification.updatedAt).toBeInstanceOf(Date);
    });

    it('should update updatedAt when document is modified', async () => {
      const notificationData = {
        userId: 'user123',
        type: 'mint' as const,
        content: 'Test notification',
        channels: ['email'] as const
      };

      const notification = await new Notification(notificationData).save();
      const originalUpdatedAt = notification.updatedAt;

      // Wait a bit to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));

      notification.content = 'Updated content';
      await notification.save();

      expect(notification.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });
  });

  describe('Indexes', () => {
    it('should have proper indexes created', async () => {
      const indexes = await Notification.collection.indexes();
      const indexNames = indexes.map(index => index.name);

      // Check for required indexes
      expect(indexNames).toContain('userId_1');
      expect(indexNames).toContain('type_1');
      expect(indexNames).toContain('status_1');
      expect(indexNames).toContain('userId_1_status_1');
      expect(indexNames).toContain('userId_1_type_1');
      expect(indexNames).toContain('userId_1_createdAt_-1');
      expect(indexNames).toContain('status_1_createdAt_1');
      expect(indexNames).toContain('type_1_status_1');
      expect(indexNames).toContain('metadata.nftId_1_type_1');
      expect(indexNames).toContain('content_text');
    });
  });
}); 