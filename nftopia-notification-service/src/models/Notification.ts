
import { Schema, model } from 'mongoose';
import { INotificationDocument, INotificationModel } from '../types/notification.types';
import mongoose, { Document, Schema, Model } from 'mongoose';

const NotificationSchema = new Schema<INotificationDocument, INotificationModel>(

// TypeScript interfaces for type safety
export interface INotificationMetadata {
  nftId?: string;
  collection?: string;
  txHash?: string;
  [key: string]: any; // Allow additional metadata fields
}

export interface INotification extends Document {
  userId: string;
  type: 'mint' | 'bid' | 'sale' | 'auction' | 'admin';
  status: 'pending' | 'sent' | 'failed' | 'read';
  content: string;
  channels: ('email' | 'sms' | 'push' | 'in-app')[];
  metadata?: INotificationMetadata;
  createdAt: Date;
  updatedAt: Date;
  readAt?: Date;
  sentAt?: Date;
  failedAt?: Date;
  retryCount: number;
  maxRetries: number;
  
  // Instance methods
  markAsRead(): Promise<INotification>;
  markAsSent(): Promise<INotification>;
  markAsFailed(): Promise<INotification>;
  canRetry(): boolean;
}

// Static methods interface
export interface INotificationModel extends Model<INotification> {
  findByUser(userId: string, limit?: number, skip?: number): Promise<INotification[]>;
  findPending(): Promise<INotification[]>;
  findByType(type: string, limit?: number): Promise<INotification[]>;
  findByNFT(nftId: string): Promise<INotification[]>;
}

// Schema definition
const notificationSchema = new Schema<INotification>(
  {
    userId: {
      type: String,
      required: [true, 'User ID is required'],
      index: true,
      trim: true,
      validate: {
        validator: function(v: string): boolean {
          return Boolean(v && v.length > 0);
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
      default: {}
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

// Pre-save hook
NotificationSchema.pre<INotificationDocument>('save', function(next) {
  // Add any pre-save logic here
  next();
});

export const Notification = model<INotificationDocument, INotificationModel>(
  'Notification',
  NotificationSchema
);
      enum: {
        values: ['mint', 'bid', 'sale', 'auction', 'admin'],
        message: 'Notification type must be one of: mint, bid, sale, auction, admin'
      },
      index: true
    },
    status: {
      type: String,
      enum: {
        values: ['pending', 'sent', 'failed', 'read'],
        message: 'Status must be one of: pending, sent, failed, read'
      },
      default: 'pending',
      index: true
    },
    content: {
      type: String,
      required: [true, 'Notification content is required'],
      trim: true,
      validate: {
        validator: function(v: string): boolean {
          return Boolean(v && v.length > 0 && v.length <= 1000);
        },
        message: 'Content must be between 1 and 1000 characters'
      }
    },
    channels: [{
      type: String,
      enum: {
        values: ['email', 'sms', 'push', 'in-app'],
        message: 'Channel must be one of: email, sms, push, in-app'
      },
      validate: {
        validator: function(channels: string[]): boolean {
          return Boolean(channels && channels.length > 0);
        },
        message: 'At least one channel must be specified'
      }
    }],
    metadata: {
      nftId: {
        type: String,
        trim: true,
        validate: {
          validator: function(v: string): boolean {
            return Boolean(!v || v.length > 0);
          },
          message: 'NFT ID cannot be empty if provided'
        }
      },
      collection: {
        type: String,
        trim: true,
        validate: {
          validator: function(v: string): boolean {
            return Boolean(!v || v.length > 0);
          },
          message: 'Collection name cannot be empty if provided'
        }
      },
      txHash: {
        type: String,
        trim: true,
        validate: {
          validator: function(v: string): boolean {
            return Boolean(!v || /^0x[a-fA-F0-9]{64}$/.test(v));
          },
          message: 'Transaction hash must be a valid 64-character hex string starting with 0x'
        }
      }
    },
    readAt: {
      type: Date,
      default: null
    },
    sentAt: {
      type: Date,
      default: null
    },
    failedAt: {
      type: Date,
      default: null
    },
    retryCount: {
      type: Number,
      default: 0,
      min: [0, 'Retry count cannot be negative']
    },
    maxRetries: {
      type: Number,
      default: 3,
      min: [1, 'Max retries must be at least 1'],
      max: [10, 'Max retries cannot exceed 10']
    }
  },
  {
    timestamps: true, // Adds createdAt and updatedAt automatically
    collection: 'notifications'
  }
);

// Compound indexes for common query patterns
notificationSchema.index({ userId: 1, status: 1 });
notificationSchema.index({ userId: 1, type: 1 });
notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ status: 1, createdAt: 1 });
notificationSchema.index({ type: 1, status: 1 });
notificationSchema.index({ 'metadata.nftId': 1, type: 1 });

// Text index for content search
notificationSchema.index({ content: 'text' });

// Instance methods
notificationSchema.methods.markAsRead = function() {
  this.status = 'read';
  this.readAt = new Date();
  return this.save();
};

notificationSchema.methods.markAsSent = function() {
  this.status = 'sent';
  this.sentAt = new Date();
  return this.save();
};

notificationSchema.methods.markAsFailed = function() {
  this.status = 'failed';
  this.failedAt = new Date();
  this.retryCount += 1;
  return this.save();
};

notificationSchema.methods.canRetry = function(): boolean {
  return this.status === 'failed' && this.retryCount < this.maxRetries;
};

// Static methods
notificationSchema.statics.findByUser = function(userId: string, limit = 50, skip = 0) {
  return this.find({ userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip);
};

notificationSchema.statics.findPending = function() {
  return this.find({ status: 'pending' }).sort({ createdAt: 1 });
};

notificationSchema.statics.findByType = function(type: string, limit = 50) {
  return this.find({ type }).sort({ createdAt: -1 }).limit(limit);
};

notificationSchema.statics.findByNFT = function(nftId: string) {
  return this.find({ 'metadata.nftId': nftId }).sort({ createdAt: -1 });
};

// Pre-save middleware for validation
notificationSchema.pre('save', function(next) {
  // Ensure at least one channel is specified
  if (!this.channels || this.channels.length === 0) {
    return next(new Error('At least one notification channel must be specified'));
  }
  
  // Validate metadata if provided
  if (this.metadata) {
    const { nftId, collection, txHash } = this.metadata;
    
    // If NFT ID is provided, collection should also be provided
    if (nftId && !collection) {
      return next(new Error('Collection name is required when NFT ID is provided'));
    }
  }
  
  next();
});

// Post-save middleware for logging
notificationSchema.post('save', function(doc) {
  console.log(`Notification saved: ${doc._id} for user ${doc.userId} with status ${doc.status}`);
});

// Create and export the model
const Notification = mongoose.model<INotification, INotificationModel>('Notification', notificationSchema);

export default Notification; 
