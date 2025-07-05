import mongoose from 'mongoose';
import Notification, { INotification, INotificationMetadata } from '../models/Notification';

// Mock MongoDB connection for testing
beforeAll(async () => {
  // Use in-memory MongoDB for testing
  await mongoose.connect('mongodb://localhost:27017/test');
});

afterAll(async () => {
  await mongoose.disconnect();
});

beforeEach(async () => {
  await Notification.deleteMany({});
});

describe('Notification Schema Validation', () => {
  it('should create a valid notification', async () => {
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

  it('should validate required fields', async () => {
    // Missing userId
    const invalidNotification1 = new Notification({
      type: 'mint',
      content: 'Test',
      channels: ['email']
    });
    await expect(invalidNotification1.save()).rejects.toThrow();

    // Missing type
    const invalidNotification2 = new Notification({
      userId: 'user123',
      content: 'Test',
      channels: ['email']
    });
    await expect(invalidNotification2.save()).rejects.toThrow();

    // Missing content
    const invalidNotification3 = new Notification({
      userId: 'user123',
      type: 'mint',
      channels: ['email']
    });
    await expect(invalidNotification3.save()).rejects.toThrow();
  });

  it('should validate enum values', async () => {
    // Invalid type
    const invalidNotification = new Notification({
      userId: 'user123',
      type: 'invalid-type',
      content: 'Test',
      channels: ['email']
    });
    await expect(invalidNotification.save()).rejects.toThrow();

    // Invalid channel
    const invalidNotification2 = new Notification({
      userId: 'user123',
      type: 'mint',
      content: 'Test',
      channels: ['invalid-channel']
    });
    await expect(invalidNotification2.save()).rejects.toThrow();
  });

  it('should validate metadata', async () => {
    const notificationData = {
      userId: 'user123',
      type: 'mint' as const,
      content: 'Test notification',
      channels: ['email'] as const,
      metadata: {
        nftId: 'nft123',
        collection: 'Cool Collection',
        txHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
      }
    };

    const notification = new Notification(notificationData);
    const savedNotification = await notification.save();

    expect(savedNotification.metadata?.nftId).toBe('nft123');
    expect(savedNotification.metadata?.collection).toBe('Cool Collection');
    expect(savedNotification.metadata?.txHash).toBe(notificationData.metadata.txHash);
  });

  it('should validate transaction hash format', async () => {
    const invalidNotification = new Notification({
      userId: 'user123',
      type: 'mint',
      content: 'Test',
      channels: ['email'],
      metadata: {
        txHash: 'invalid-hash'
      }
    });
    await expect(invalidNotification.save()).rejects.toThrow();
  });

  it('should require collection when nftId is provided', async () => {
    const invalidNotification = new Notification({
      userId: 'user123',
      type: 'mint',
      content: 'Test',
      channels: ['email'],
      metadata: {
        nftId: 'nft123'
        // Missing collection
      }
    });
    await expect(invalidNotification.save()).rejects.toThrow();
  });
});

describe('Notification Instance Methods', () => {
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

  it('should mark notification as failed', async () => {
    const initialRetryCount = notification.retryCount;
    await notification.markAsFailed();
    
    expect(notification.status).toBe('failed');
    expect(notification.failedAt).toBeInstanceOf(Date);
    expect(notification.retryCount).toBe(initialRetryCount + 1);
  });

  it('should check if notification can be retried', async () => {
    expect(notification.canRetry()).toBe(false);

    await notification.markAsFailed();
    expect(notification.canRetry()).toBe(true);

    notification.retryCount = notification.maxRetries;
    expect(notification.canRetry()).toBe(false);
  });
});

describe('Notification Static Methods', () => {
  beforeEach(async () => {
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
}); 