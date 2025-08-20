import { Schema, model, Document } from "mongoose";

export interface INotification extends Document {
  userId: string;
  type: "mint" | "bid" | "sale" | "auction" | "admin";
  status: "pending" | "sent" | "failed" | "read";
  content: string;
  channels: ("email" | "sms" | "push" | "in-app")[];
  metadata?: {
    nftId?: string;
    collection?: string;
    txHash?: string;
  };

  // NEW: email-specific fields for SendGrid
  email?: {
    templateId?: string; // which SendGrid dynamic template was used
    messageId?: string; // SendGrid response message id
    to?: string; // recipient
    error?: string; // error details if sending failed
  };

  createdAt: Date;
  updatedAt: Date;
}

export const NotificationSchema = new Schema<INotification>(
  {
    userId: { type: String, required: true, index: true },
    type: {
      type: String,
      required: true,
      enum: ["mint", "bid", "sale", "auction", "admin"],
      index: true,
    },
    status: {
      type: String,
      enum: ["pending", "sent", "failed", "read"],
      default: "pending",
    },
    content: { type: String, required: true },
    channels: [
      {
        type: String,
        enum: ["email", "sms", "push", "in-app"],
      },
    ],
    metadata: {
      nftId: { type: String },
      collection: { type: String },
      txHash: { type: String },
    },

    // ✅ New SendGrid email integration
    email: {
      templateId: { type: String },
      messageId: { type: String, index: true },
      to: { type: String },
      error: { type: String },
    },
  },
  { timestamps: true }
);

NotificationSchema.index({ userId: 1, type: 1 });

export const Notification = model<INotification>(
  "Notification",
  NotificationSchema
);
