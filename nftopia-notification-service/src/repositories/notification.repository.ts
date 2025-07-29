import { Notification } from '../models/notification.model';
import { NotificationDocument, NFTMetadata, INotificationDocument } from '../types/notification.types';
import { logger } from '../utils/logger';
import { Document, HydratedDocument } from 'mongoose';

interface PaginationOptions {
  limit?: number;
  skip?: number;
}

// Extended interface that includes all Mongoose document properties
type MongooseNotificationDocument = HydratedDocument<INotificationDocument> & {
  isDeleted?: boolean;
};

// Type for lean documents
type LeanNotificationDocument = INotificationDocument & {
  _id: string;
  __v?: number;
  isDeleted?: boolean;
};

export class NotificationRepository {
  async create(notification: {
    userId: string;
    type: 'email' | 'sms' | 'push' | 'in-app';
    content: string;
    recipient: string;
    metadata?: NFTMetadata;
    status?: 'pending' | 'sent' | 'failed' | 'read';
  }): Promise<NotificationDocument> {
    try {
      const notificationData = {
        ...notification,
        status: notification.status || 'pending',
        isDeleted: false
      };

      const created = await Notification.create(notificationData);
      logger.info(`Notification created for user ${notification.userId}`);
      
      return this.transformToNotificationDocument(created);
    } catch (error) {
      logger.error('Failed to create notification:', error);
      throw new Error('Failed to create notification');
    }
  }

  async findById(id: string): Promise<NotificationDocument | null> {
    const doc = await Notification.findOne({ _id: id, isDeleted: false }).lean().exec();
    return doc ? this.transformToNotificationDocument(doc as LeanNotificationDocument) : null;
  }

  async findByUserId(userId: string, options?: PaginationOptions): Promise<NotificationDocument[]> {
    const query = Notification.find({ userId, isDeleted: false });
    
    if (options?.limit) query.limit(options.limit);
    if (options?.skip) query.skip(options.skip);
    
    const docs = await query.sort({ createdAt: -1 }).lean().exec();
    return (docs as LeanNotificationDocument[]).map(doc => this.transformToNotificationDocument(doc));
  }

  async findByNFT(nftId: string): Promise<NotificationDocument[]> {
    const docs = await Notification.find({ 
      'metadata.nft.nftId': nftId,
      isDeleted: false 
    }).sort({ createdAt: -1 }).lean().exec();
    return (docs as LeanNotificationDocument[]).map(doc => this.transformToNotificationDocument(doc));
  }

  async markAsRead(id: string): Promise<NotificationDocument> {
    try {
      const updated = await Notification.findByIdAndUpdate(
        id,
        { status: 'read' },
        { new: true }
      ).lean().exec();
      
      if (!updated) throw new Error('Notification not found');
      return this.transformToNotificationDocument(updated as LeanNotificationDocument);
    } catch (error) {
      logger.error(`Failed to mark notification ${id} as read:`, error);
      throw error;
    }
  }

  async updateStatus(id: string, status: 'sent' | 'failed'): Promise<NotificationDocument> {
    try {
      const updated = await Notification.findByIdAndUpdate(
        id,
        { status },
        { new: true }
      ).lean().exec();
      
      if (!updated) throw new Error('Notification not found');
      return this.transformToNotificationDocument(updated as LeanNotificationDocument);
    } catch (error) {
      logger.error(`Failed to update status for notification ${id}:`, error);
      throw error;
    }
  }

  async softDelete(id: string): Promise<NotificationDocument> {
    try {
      const deleted = await Notification.findByIdAndUpdate(
        id,
        { isDeleted: true },
        { new: true }
      ).lean().exec();
      
      if (!deleted) throw new Error('Notification not found');
      logger.info(`Soft deleted notification ${id}`);
      return this.transformToNotificationDocument(deleted as LeanNotificationDocument);
    } catch (error) {
      logger.error(`Failed to soft delete notification ${id}:`, error);
      throw error;
    }
  }

  async hardDelete(id: string): Promise<void> {
    try {
      const result = await Notification.deleteOne({ _id: id }).exec();
      if (result.deletedCount === 0) {
        throw new Error('Notification not found');
      }
      logger.info(`Hard deleted notification ${id}`);
    } catch (error) {
      logger.error(`Failed to hard delete notification ${id}:`, error);
      throw error;
    }
  }

  private transformToNotificationDocument(
    doc: MongooseNotificationDocument | LeanNotificationDocument
  ): NotificationDocument {
    // Handle both hydrated documents and lean documents
    const plainDoc = doc instanceof Document ? doc.toObject() : doc;
    
    return {
      _id: plainDoc._id.toString(),
      userId: plainDoc.userId,
      type: plainDoc.type,
      content: plainDoc.content,
      recipient: plainDoc.recipient,
      status: plainDoc.status,
      metadata: plainDoc.metadata,
      createdAt: plainDoc.createdAt,
      updatedAt: plainDoc.updatedAt
    };
  }
}
