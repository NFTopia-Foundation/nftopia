import { INotificationDocument } from "@/types/notification.types";
import mongoose, { Document, Schema, Model } from "mongoose";

// TypeScript interfaces for type safety
export interface INotificationMetadata {
  nftId?: string;
  collection?: string;
  txHash?: string;
  [key: string]: any; // Allow additional metadata fields
}

export interface ISMSFailure {
  messageSid?: string;
  errorCode?: string;
  errorMessage?: string;
  nextRetryAt?: Date;
  fallbackTriggered?: boolean;
}

export interface INotification extends Document {
  userId: string;
  type: "mint" | "bid" | "sale" | "auction" | "admin";
  status: "pending" | "sent" | "failed" | "read";
  content: string;
  channels: ("email" | "sms" | "push" | "in-app")[];
  metadata?: INotificationMetadata;
  smsFailure?: ISMSFailure;
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
  recordSMSFailure(failure: Partial<ISMSFailure>): Promise<INotification>;
  scheduleSMSRetry(nextRetryAt: Date): Promise<INotification>;
}

// Static methods interface
export interface INotificationModel extends Model<INotification> {
  findByUser(
    userId: string,
    limit?: number,
    skip?: number
  ): Promise<INotification[]>;
  findPending(): Promise<INotification[]>;
  findByType(type: string, limit?: number): Promise<INotification[]>;
  findByNFT(nftId: string): Promise<INotification[]>;
  findSMSFailuresByErrorCode(errorCode: string): Promise<INotification[]>;
  findPendingSMSRetries(): Promise<INotification[]>;
}

// Schema definition
const notificationSchema = new Schema<INotification>(
  {
    userId: {
      type: String,
      required: [true, "User ID is required"],
      index: true,
      trim: true,
      validate: {
        validator: function (v: string): boolean {
          return Boolean(v && v.length > 0);
        },
        message: "User ID cannot be empty",
      },
    },
    type: {
      type: String,
      required: [true, "Notification type is required"],
      enum: {
        values: ["mint", "bid", "sale", "auction", "admin"],
        message:
          "Notification type must be one of: mint, bid, sale, auction, admin",
      },
      index: true,
    },
    status: {
      type: String,
      enum: {
        values: ["pending", "sent", "failed", "read"],
        message: "Status must be one of: pending, sent, failed, read",
      },
      default: "pending",
      index: true,
    },
    content: {
      type: String,
      required: [true, "Notification content is required"],
      trim: true,
      validate: {
        validator: function (v: string): boolean {
          return Boolean(v && v.length > 0 && v.length <= 1000);
        },
        message: "Content must be between 1 and 1000 characters",
      },
    },
    channels: [
      {
        type: String,
        enum: {
          values: ["email", "sms", "push", "in-app"],
          message: "Channel must be one of: email, sms, push, in-app",
        },
      },
    ],
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
      validate: {
        validator: function (v: any): boolean {
          if (v && typeof v === "object" && v.nftId) {
            return !!(typeof v.nftId === "string" && v.nftId.trim().length > 0);
          }
          return true;
        },
        message: "NFT ID must be a non-empty string when provided",
      },
      nftId: {
        type: String,
        trim: true,
        validate: {
          validator: function (v: string): boolean {
            return Boolean(!v || v.length > 0);
          },
          message: "NFT ID cannot be empty if provided",
        },
      },
      collection: {
        type: String,
        trim: true,
        validate: {
          validator: function (v: string): boolean {
            return Boolean(!v || v.length > 0);
          },
          message: "Collection name cannot be empty if provided",
        },
      },
      txHash: {
        type: String,
        trim: true,
        validate: {
          validator: function (v: string): boolean {
            return Boolean(!v || /^0x[a-fA-F0-9]{64}$/.test(v));
          },
          message:
            "Transaction hash must be a valid 64-character hex string starting with 0x",
        },
      },
    },
    // SMS failure tracking
    smsFailure: {
      messageSid: {
        type: String,
        trim: true,
        index: true,
      },
      errorCode: {
        type: String,
        trim: true,
      },
      errorMessage: {
        type: String,
        trim: true,
      },
      nextRetryAt: {
        type: Date,
        index: true,
      },
      fallbackTriggered: {
        type: Boolean,
        default: false,
      },
    },
    readAt: {
      type: Date,
      default: null,
    },
    sentAt: {
      type: Date,
      default: null,
    },
    failedAt: {
      type: Date,
      default: null,
    },
    retryCount: {
      type: Number,
      default: 0,
      min: [0, "Retry count cannot be negative"],
    },
    maxRetries: {
      type: Number,
      default: 3,
      min: [1, "Max retries must be at least 1"],
      max: [10, "Max retries cannot exceed 10"],
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt automatically
    collection: "notifications",
  }
);

// Strategic Database Indexes for Performance Optimization

/**
 * Compound index for user notification center queries
 * Optimizes queries filtering by user and status (e.g., unread notifications)
 * Pattern: db.notifications.find({ userId: "user123", status: "pending" })
 */

notificationSchema.index({ userId: 1, status: 1 });

/**
 * Time-based sorting index (descending order)
 * Optimizes chronological queries and pagination
 * Pattern: db.notifications.find().sort({ createdAt: -1 })
 */
notificationSchema.index({ createdAt: -1 });

/**
 * NFT-specific compound index for metadata queries
 * Optimizes NFT-related notification lookups by ID and type
 * Pattern: db.notifications.find({ "metadata.nftId": "nft456", type: "push" })
 */
notificationSchema.index({
  "metadata.nftId": 1,
  type: 1,
});

/**
 * TTL (Time-To-Live) index for automatic document expiration
 * Automatically removes notifications after 90 days (7,776,000 seconds)
 * Helps maintain database performance by preventing unbounded growth
 */
notificationSchema.index(
  {
    createdAt: 1,
  },
  {
    expireAfterSeconds: 90 * 24 * 60 * 60, // 90-day retention policy
  }
);

// Pre-save hook
notificationSchema.pre<INotificationDocument>("save", function (next) {
  // Add any pre-save logic here
  next();
});

// Compound indexes for common query patterns
notificationSchema.index({ userId: 1, status: 1 });
notificationSchema.index({ userId: 1, type: 1 });
notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ status: 1, createdAt: 1 });
notificationSchema.index({ type: 1, status: 1 });
notificationSchema.index({ "metadata.nftId": 1, type: 1 });
notificationSchema.index({ "smsFailure.errorCode": 1 });
notificationSchema.index({ "smsFailure.nextRetryAt": 1 });
notificationSchema.index({ "smsFailure.messageSid": 1 });

// Text index for content search
notificationSchema.index({ content: "text" });

// Instance methods
notificationSchema.methods.markAsRead = function () {
  this.status = "read";
  this.readAt = new Date();
  return this.save();
};

notificationSchema.methods.markAsSent = function () {
  this.status = "sent";
  this.sentAt = new Date();
  return this.save();
};

notificationSchema.methods.markAsFailed = function () {
  this.status = "failed";
  this.failedAt = new Date();
  this.retryCount += 1;
  return this.save();
};

notificationSchema.methods.canRetry = function (): boolean {
  return this.status === "failed" && this.retryCount < this.maxRetries;
};

// New SMS-specific methods
notificationSchema.methods.recordSMSFailure = function (
  failure: Partial<ISMSFailure>
) {
  this.smsFailure = { ...this.smsFailure, ...failure };
  this.status = "failed";
  this.failedAt = new Date();
  this.retryCount += 1;
  return this.save();
};

notificationSchema.methods.scheduleSMSRetry = function (nextRetryAt: Date) {
  if (!this.smsFailure) {
    this.smsFailure = {};
  }
  this.smsFailure.nextRetryAt = nextRetryAt;
  return this.save();
};

// Static methods
notificationSchema.statics.findByUser = function (
  userId: string,
  limit = 50,
  skip = 0
) {
  return this.find({ userId }).sort({ createdAt: -1 }).limit(limit).skip(skip);
};

notificationSchema.statics.findPending = function () {
  return this.find({ status: "pending" }).sort({ createdAt: 1 });
};

notificationSchema.statics.findByType = function (type: string, limit = 50) {
  return this.find({ type }).sort({ createdAt: -1 }).limit(limit);
};

notificationSchema.statics.findByNFT = function (nftId: string) {
  return this.find({ "metadata.nftId": nftId }).sort({ createdAt: -1 });
};

// New SMS failure-specific static methods
notificationSchema.statics.findSMSFailuresByErrorCode = function (
  errorCode: string
) {
  return this.find({ "smsFailure.errorCode": errorCode }).sort({
    createdAt: -1,
  });
};

notificationSchema.statics.findPendingSMSRetries = function () {
  return this.find({
    status: "failed",
    "smsFailure.nextRetryAt": { $lte: new Date() },
    retryCount: { $lt: 3 },
  }).sort({ "smsFailure.nextRetryAt": 1 });
};

// Pre-save middleware for validation
notificationSchema.pre("save", function (next) {
  // Ensure at least one channel is specified
  if (!this.channels || this.channels.length === 0) {
    return next(
      new Error("At least one notification channel must be specified")
    );
  }

  // Validate metadata if provided
  if (this.metadata) {
    const { nftId, collection } = this.metadata;

    // If NFT ID is provided, collection should also be provided
    if (nftId && !collection) {
      return next(
        new Error("Collection name is required when NFT ID is provided")
      );
    }
  }

  // Proceed with save if all validations pass
  next();
});

// Post-save middleware for logging
notificationSchema.post("save", function (doc) {
  console.log(
    `Notification saved: ${doc._id} for user ${doc.userId} with status ${doc.status}`
  );
});

// Create and export the model
export const Notification = mongoose.model<INotification, INotificationModel>(
  "Notification",
  notificationSchema
);
