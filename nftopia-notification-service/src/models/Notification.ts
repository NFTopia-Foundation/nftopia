import { Schema, model } from 'mongoose';
import { INotificationDocument, INotificationModel } from '../types/notification.types';

const NotificationSchema = new Schema<INotificationDocument, INotificationModel>(
  {
    userId: {
      type: String,
      required: [true, 'User ID is required'],
      validate: {
        validator: function(v: string): boolean {
          return !!(v && v.trim().length > 0);
        },
        message: 'User ID cannot be empty'
      }
    },
    type: {
      type: String,
      required: [true, 'Notification type is required'],
      enum: ['email', 'sms', 'push', 'in-app']
    },
    status: {
      type: String,
      required: [true, 'Status is required'],
      enum: ['pending', 'sent', 'failed'],
      default: 'pending'
    },
    content: {
      type: String,
      required: [true, 'Content is required']
    },
    recipient: {
      type: String,
      required: [true, 'Recipient is required']
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
      validate: {
        validator: function(v: any): boolean {
          if (v && typeof v === 'object' && v.nftId) {
            return !!(typeof v.nftId === 'string' && v.nftId.trim().length > 0);
          }
          return true;
        },
        message: 'NFT ID must be a non-empty string when provided'
      }
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

// Strategic Database Indexes for Performance Optimization

/**
 * Compound index for user notification center queries
 * Optimizes queries filtering by user and status (e.g., unread notifications)
 * Pattern: db.notifications.find({ userId: "user123", status: "pending" })
 */
NotificationSchema.index({ userId: 1, status: 1 });

/**
 * Time-based sorting index (descending order)
 * Optimizes chronological queries and pagination
 * Pattern: db.notifications.find().sort({ createdAt: -1 })
 */
NotificationSchema.index({ createdAt: -1 });

/**
 * NFT-specific compound index for metadata queries
 * Optimizes NFT-related notification lookups by ID and type
 * Pattern: db.notifications.find({ "metadata.nftId": "nft456", type: "push" })
 */
NotificationSchema.index({ 
  "metadata.nftId": 1,
  type: 1
});

/**
 * TTL (Time-To-Live) index for automatic document expiration
 * Automatically removes notifications after 90 days (7,776,000 seconds)
 * Helps maintain database performance by preventing unbounded growth
 */
NotificationSchema.index({ 
  createdAt: 1 
}, { 
  expireAfterSeconds: 90 * 24 * 60 * 60 // 90-day retention policy
});

// Pre-save hook
NotificationSchema.pre<INotificationDocument>('save', function(next) {
  // Add any pre-save logic here
  next();
});

export const Notification = model<INotificationDocument, INotificationModel>(
  'Notification',
  NotificationSchema
);
