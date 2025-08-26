import { FilterQuery } from 'mongoose';
import { Notification, INotification } from '../models/notification.model';
import { normalizePagination, PaginationOptions } from '../utils/pagination';
import { NotFound } from '../utils/httpErrors';

export type NotificationType =
  | 'mint'
  | 'bid'
  | 'sale'
  | 'auction'
  | 'admin'
  | 'passwordReset'
  | 'marketplaceAnnouncement';

export type NotificationStatus =
  | 'pending'
  | 'sent'
  | 'failed'
  | 'read';

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
  softDelete(id: string): Promise<INotification>;
  hardDelete(id: string): Promise<void>;
}

export class NotificationRepository implements INotificationRepository {

async create(input: {
    userId: string;
    type: NotificationType;
    content: string;
    metadata?: INotification['metadata'];
    channels?: INotification['channels'];
  }): Promise<INotification> {
    const doc = new Notification({
      ...input,
      status: 'pending',   // default status before delivery
      deletedAt: null,     // ensure soft delete consistency
    });
  
    const saved = await doc.save(); // full Mongoose document with _id
    return saved;                   // return document itself, not plain object
  }
  

  async findById(id: string): Promise<INotification | null> {
    return Notification.findById(id).lean();
  }

  async findByUserId(userId: string, options?: PaginationOptions): Promise<INotification[]> {
    const { limit, skip } = normalizePagination(options);
    return Notification.find({ userId, deletedAt: null })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
  }

  async findByNFT(nftId: string): Promise<INotification[]> {
    const filter: FilterQuery<INotification> = {
      'metadata.nftId': nftId,
      deletedAt: null,
    } as any;
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
