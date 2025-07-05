import { Document, Model } from 'mongoose';

// 1. NFT-specific metadata type
export interface NFTMetadata {
  nftId: string;
  collectionId?: string;
  transactionHash?: string;
  contractAddress?: string;
  tokenStandard?: 'ERC-721' | 'ERC-1155';
}

// 2. Core Notification Types
export type NotificationType = 'email' | 'sms' | 'push' | 'in-app';
export type NotificationStatus = 'pending' | 'sent' | 'failed' | 'read';

// 3. Base Notification Interface
export interface INotification {
  _id?: string;
  userId: string;
  type: NotificationType;
  status: NotificationStatus;
  content: string;
  recipient: string;
  metadata?: {
    nft?: NFTMetadata;
    [key: string]: any;
  };
  createdAt?: Date;
  updatedAt?: Date;
}

// 4. Document Interfaces
export interface INotificationDocument extends INotification, Document {
  _id: string;
  createdAt: Date;
  updatedAt: Date;
}

// 5. Type alias for backward compatibility
export type NotificationDocument = INotificationDocument;

// 6. Model Interface
export interface INotificationModel extends Model<INotificationDocument> {
  findByUserId(userId: string): Promise<INotificationDocument[]>;
  findByStatus(status: NotificationStatus): Promise<INotificationDocument[]>;
  findByType(type: NotificationType): Promise<INotificationDocument[]>;
  findByNFTMetadata(nftId: string): Promise<INotificationDocument[]>;
}


// Data Transfer Objects and other interfaces
export interface NotificationPayload {
  userId: string;
  type: 'email' | 'sms' | 'push' | 'in-app';
  content: string;
  recipient: string;
  metadata?: Record<string, any>;
}

export interface CreateNotificationDto {
  userId: string;
  type: 'email' | 'sms' | 'push' | 'in-app';
  content: string;
  recipient: string;
  status?: 'pending' | 'sent' | 'failed';
  metadata?: Record<string, any>;
}

// Alternative name for backward compatibility
export interface CreateNotificationPayload extends CreateNotificationDto {}

export interface UpdateNotificationDto {
  status?: 'pending' | 'sent' | 'failed';
  metadata?: Record<string, any>;
}

export interface NotificationQuery {
  userId?: string;
  type?: 'email' | 'sms' | 'push' | 'in-app';
  status?: 'pending' | 'sent' | 'failed';
  recipient?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

// Query parameters interface
export interface NotificationQueryParams {
  userId: string;
  type?: 'email' | 'sms' | 'push' | 'in-app';
  status?: 'pending' | 'sent' | 'failed';
  startDate?: Date;
  endDate?: Date;
}

// Pagination options interface
export interface PaginationOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Database response interface for consistent returns
export interface DatabaseResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Statistics interface
export interface NotificationStats {
  total: number;
  pending: number;
  sent: number;
  failed: number;
  byType: {
    email: number;
    sms: number;
    push: number;
    'in-app': number;
  };
}

// Repository method return types
export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Extend Express Request interface
declare global {
  namespace Express {
    interface Request {
      notificationPayload?: NotificationPayload;
    }
  }
}

