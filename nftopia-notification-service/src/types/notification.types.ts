import { Document, Model } from 'mongoose';

// Base notification interface
export interface INotification {
  _id?: string; // Fixed: Changed from *id to _id (MongoDB convention)
  userId: string;
  type: 'email' | 'sms' | 'push' | 'in-app';
  status: 'pending' | 'sent' | 'failed';
  content: string;
  recipient: string;
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, any>;
}

// Mongoose Document interface (extends Document and INotification)
export interface INotificationDocument extends INotification, Document {
  _id: string;
  createdAt: Date;
  updatedAt: Date;
}

// Mongoose Model interface (for static methods)
export interface INotificationModel extends Model<INotificationDocument> {
  // Add any static methods here if needed
  findByUserId(userId: string): Promise<INotificationDocument[]>;
  findByStatus(status: 'pending' | 'sent' | 'failed'): Promise<INotificationDocument[]>;
  findByType(type: 'email' | 'sms' | 'push' | 'in-app'): Promise<INotificationDocument[]>;
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
