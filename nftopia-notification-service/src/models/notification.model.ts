import { Schema, model, Document } from 'mongoose';

interface NFTMetadata {
  nftId: string;
  collectionId?: string;
  transactionHash?: string;
}

interface NotificationDocument extends Document {
  userId: string;
  type: 'email' | 'sms' | 'push' | 'in-app';
  content: string;
  metadata?: NFTMetadata;
  status: 'pending' | 'sent' | 'failed' | 'read';
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<NotificationDocument>({
  userId: { type: String, required: true, index: true },
  type: { type: String, required: true, enum: ['email', 'sms', 'push', 'in-app'] },
  content: { type: String, required: true },
  metadata: {
    nftId: String,
    collectionId: String,
    transactionHash: String
  },
  status: { 
    type: String, 
    default: 'pending', 
    enum: ['pending', 'sent', 'failed', 'read'] 
  },
  isDeleted: { type: Boolean, default: false },
}, {
  timestamps: true
});

export const Notification = model<NotificationDocument>('Notification', NotificationSchema);