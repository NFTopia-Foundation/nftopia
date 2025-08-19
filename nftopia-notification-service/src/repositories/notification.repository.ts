// import { Notification } from '../models/notification.model';
// import { NotificationDocument, NFTMetadata, INotificationDocument } from '../types/notification.types';
// import { logger } from '../utils/logger';
// import { Document, HydratedDocument } from 'mongoose';

// interface PaginationOptions {
//   limit?: number;
//   skip?: number;
// }

// // Extended interface that includes all Mongoose document properties
// type MongooseNotificationDocument = HydratedDocument<INotificationDocument> & {
//   isDeleted?: boolean;
// };

// // Type for lean documents
// type LeanNotificationDocument = INotificationDocument & {
//   _id: string;
//   __v?: number;
//   isDeleted?: boolean;
// };

// export class NotificationRepository {
//   async create(notification: {
//     userId: string;
//     type: 'email' | 'sms' | 'push' | 'in-app';
//     content: string;
//     recipient: string;
//     metadata?: NFTMetadata;
//     status?: 'pending' | 'sent' | 'failed' | 'read';
//   }): Promise<NotificationDocument> {
//     try {
//       const notificationData = {
//         ...notification,
//         status: notification.status || 'pending',
//         isDeleted: false
//       };

//       const created = await Notification.create(notificationData);
//       logger.info(`Notification created for user ${notification.userId}`);
      
//       return this.transformToNotificationDocument(created);
//     } catch (error) {
//       logger.error('Failed to create notification:', error);
//       throw new Error('Failed to create notification');
//     }
//   }

//   async findById(id: string): Promise<NotificationDocument | null> {
//     const doc = await Notification.findOne({ _id: id, isDeleted: false }).lean().exec();
//     return doc ? this.transformToNotificationDocument(doc as LeanNotificationDocument) : null;
//   }

//   async findByUserId(userId: string, options?: PaginationOptions): Promise<NotificationDocument[]> {
//     const query = Notification.find({ userId, isDeleted: false });
    
//     if (options?.limit) query.limit(options.limit);
//     if (options?.skip) query.skip(options.skip);
    
//     const docs = await query.sort({ createdAt: -1 }).lean().exec();
//     return (docs as LeanNotificationDocument[]).map(doc => this.transformToNotificationDocument(doc));
//   }

//   async findByNFT(nftId: string): Promise<NotificationDocument[]> {
//     const docs = await Notification.find({ 
//       'metadata.nft.nftId': nftId,
//       isDeleted: false 
//     }).sort({ createdAt: -1 }).lean().exec();
//     return (docs as LeanNotificationDocument[]).map(doc => this.transformToNotificationDocument(doc));
//   }

//   async markAsRead(id: string): Promise<NotificationDocument> {
//     try {
//       const updated = await Notification.findByIdAndUpdate(
//         id,
//         { status: 'read' },
//         { new: true }
//       ).lean().exec();
      
//       if (!updated) throw new Error('Notification not found');
//       return this.transformToNotificationDocument(updated as LeanNotificationDocument);
//     } catch (error) {
//       logger.error(`Failed to mark notification ${id} as read:`, error);
//       throw error;
//     }
//   }

//   async updateStatus(id: string, status: 'sent' | 'failed'): Promise<NotificationDocument> {
//     try {
//       const updated = await Notification.findByIdAndUpdate(
//         id,
//         { status },
//         { new: true }
//       ).lean().exec();
      
//       if (!updated) throw new Error('Notification not found');
//       return this.transformToNotificationDocument(updated as LeanNotificationDocument);
//     } catch (error) {
//       logger.error(`Failed to update status for notification ${id}:`, error);
//       throw error;
//     }
//   }

//   async softDelete(id: string): Promise<NotificationDocument> {
//     try {
//       const deleted = await Notification.findByIdAndUpdate(
//         id,
//         { isDeleted: true },
//         { new: true }
//       ).lean().exec();
      
//       if (!deleted) throw new Error('Notification not found');
//       logger.info(`Soft deleted notification ${id}`);
//       return this.transformToNotificationDocument(deleted as LeanNotificationDocument);
//     } catch (error) {
//       logger.error(`Failed to soft delete notification ${id}:`, error);
//       throw error;
//     }
//   }

//   async hardDelete(id: string): Promise<void> {
//     try {
//       const result = await Notification.deleteOne({ _id: id }).exec();
//       if (result.deletedCount === 0) {
//         throw new Error('Notification not found');
//       }
//       logger.info(`Hard deleted notification ${id}`);
//     } catch (error) {
//       logger.error(`Failed to hard delete notification ${id}:`, error);
//       throw error;
//     }
//   }

//   private transformToNotificationDocument(
//     doc: MongooseNotificationDocument | LeanNotificationDocument
//   ): NotificationDocument {
//     // Handle both hydrated documents and lean documents
//     const plainDoc = doc instanceof Document ? doc.toObject() : doc;
    
//     return {
//       _id: plainDoc._id.toString(),
//       userId: plainDoc.userId,
//       type: plainDoc.type,
//       content: plainDoc.content,
//       recipient: plainDoc.recipient,
//       status: plainDoc.status,
//       metadata: plainDoc.metadata,
//       createdAt: plainDoc.createdAt,
//       updatedAt: plainDoc.updatedAt
//     };
//   }
// }


import { FilterQuery } from 'mongoose';
import { Notification, INotification  } from '../models/Notification';
import { normalizePagination, PaginationOptions } from '../utils/pagination';
import { NotFound } from '../utils/httpErrors';



export type NotificationType = 'mint' | 'bid' | 'sale' | 'auction' | 'admin';
export type NotificationStatus = 'pending' | 'sent' | 'failed' | 'read';


export interface INotificationRepository {
// Create
create(notification: {
userId: string;
type: NotificationType;
content: string;
metadata?: INotification['metadata'];
channels?: INotification['channels'];
}): Promise<INotification>;


// Read
findById(id: string): Promise<INotification | null>;
findByUserId(userId: string, options?: PaginationOptions): Promise<INotification[]>;
findByNFT(nftId: string): Promise<INotification[]>;


// Update
markAsRead(id: string): Promise<INotification>;
updateStatus(id: string, status: Extract<NotificationStatus, 'sent' | 'failed'>): Promise<INotification>;


// Delete
softDelete(id: string): Promise<INotification>; // Keeps audit trail
hardDelete(id: string): Promise<void>; // For GDPR compliance
}


export class NotificationRepository implements INotificationRepository {
async create(input: { userId: string; type: NotificationType; content: string; metadata?: INotification['metadata']; channels?: INotification['channels']; }): Promise<INotification> {
const doc = await Notification.create({ ...input });
return doc.toObject() as INotification;
}


async findById(id: string): Promise<INotification | null> {
return Notification.findById(id).lean();
}


async findByUserId(userId: string, options?: PaginationOptions): Promise<INotification[]> {
const { limit, skip } = normalizePagination(options);
return Notification.find({ userId, deletedAt: null }).sort({ createdAt: -1 }).skip(skip).limit(limit).lean();
}


async findByNFT(nftId: string): Promise<INotification[]> {
const filter: FilterQuery<INotification> = { 'metadata.nftId': nftId, deletedAt: null } as any;
return Notification.find(filter).sort({ createdAt: -1 }).lean();
}


async markAsRead(id: string): Promise<INotification> {
const updated = await Notification.findOneAndUpdate(
{ _id: id, deletedAt: null },
{ $set: { status: 'read' as NotificationStatus } },
{ new: true }
).lean();
if (!updated) throw NotFound('Notification not found');
return updated;
}

async updateStatus(id: string, status: 'sent' | 'failed'): Promise<INotification> {
    const updated = await Notification.findOneAndUpdate(
    { _id: id, deletedAt: null },
    { $set: { status } },
    { new: true }
    ).lean();
    if (!updated) throw NotFound('Notification not found');
    return updated;
    }
    
    
    async softDelete(id: string): Promise<INotification> {
    const updated = await Notification.findOneAndUpdate(
    { _id: id, deletedAt: null },
    { $set: { deletedAt: new Date() } },
    { new: true }
    ).lean();
    if (!updated) throw NotFound('Notification not found');
    return updated;
    }
    
    
    async hardDelete(id: string): Promise<void> {
    const res = await Notification.deleteOne({ _id: id });
    if (res.deletedCount === 0) throw NotFound('Notification not found');
    }
}