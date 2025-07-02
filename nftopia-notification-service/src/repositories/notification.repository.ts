// import { NotificationType, NotificationDocument, NFTMetadata, PaginationOptions } from '../types';

import { NotificationType } from "../types/sms";
import { NotificationDocument } from "../models/notification.model";
import { NFTMetadata } from "../types/nft";
import { PaginationOptions } from "../types/pagination";


export interface INotificationRepository {
  // Create
  create(notification: {
    userId: string;
    type: NotificationType;
    content: string;
    metadata?: NFTMetadata;
  }): Promise<NotificationDocument>;

  // Read
  findById(id: string): Promise<NotificationDocument | null>;
  findByUserId(userId: string, options?: PaginationOptions): Promise<NotificationDocument[]>;
  findByNFT(nftId: string): Promise<NotificationDocument[]>;

  // Update
  markAsRead(id: string): Promise<NotificationDocument>;
  updateStatus(id: string, status: 'sent' | 'failed'): Promise<NotificationDocument>;

  // Delete
  softDelete(id: string): Promise<NotificationDocument>; // Keeps audit trail
  hardDelete(id: string): Promise<void>; // For GDPR compliance
}