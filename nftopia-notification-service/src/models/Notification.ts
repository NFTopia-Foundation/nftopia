import { Schema, model } from 'mongoose';
import { INotificationDocument, INotificationModel } from '../types/notification.types';

const NotificationSchema = new Schema<INotificationDocument, INotificationModel>(
  {
    userId: {
      type: String,
      required: [true, 'User ID is required'],
      index: true
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
