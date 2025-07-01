import { Notification } from '../models/Notification';

// Database index configuration for notifications collection
export class NotificationIndexes {
  // Creates all required indexes for optimal query performance
  static async createIndexes() {
    try {
      // Single field indexes
      await Notification.collection.createIndex({ userId: 1 });
      await Notification.collection.createIndex({ status: 1 });
      await Notification.collection.createIndex({ type: 1 });
      await Notification.collection.createIndex({ createdAt: -1 });
      
      // Compound indexes
      await Notification.collection.createIndex(
        { userId: 1, status: 1 },
        { name: 'user_status_idx' }
      );
      
      await Notification.collection.createIndex(
        { type: 1, status: 1, createdAt: -1 },
        { name: 'type_status_time_idx' }
      );
      
      await Notification.collection.createIndex(
        { userId: 1, type: 1, createdAt: -1 },
        { name: 'user_type_time_idx' }
      );
      
      console.log('Notification indexes created successfully');
    } catch (error) {
      console.error('Failed to create notification indexes:', error);
      throw new Error('Index creation failed');
    }
  }

  // Drops all indexes (for development/testing only)
  static async dropIndexes() {
    try {
      await Notification.collection.dropIndexes();
      console.log('Notification indexes dropped successfully');
    } catch (error) {
      console.error('Failed to drop notification indexes:', error);
      throw new Error('Index drop failed');
    }
  }
}

// Initialize indexes when this module is imported
NotificationIndexes.createIndexes().catch((error) => {
  console.error('Automatic index creation failed:', error);
});
