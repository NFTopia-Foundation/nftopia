// src/models/sms-suppression.model.ts
import { Schema, model, Document } from 'mongoose';
import { database } from '../config/database'; // Your existing MongoDB config

export interface SmsSuppressionDocument extends Document {
  phone: string;
  type: 'USER_INITIATED' | 'CARRIER';
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const SmsSuppressionSchema = new Schema<SmsSuppressionDocument>(
  {
    phone: { 
      type: String, 
      required: true,
      index: true,
      unique: true 
    },
    type: { 
      type: String, 
      required: true,
      enum: ['USER_INITIATED', 'CARRIER'] 
    },
    expiresAt: { 
      type: Date, 
      required: true,
      index: { expires: '0s' } // Auto-delete when expiresAt passes
    }
  },
  {
    timestamps: true // Adds createdAt and updatedAt automatically
  }
);

// Create TTL index for automatic expiration
SmsSuppressionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const SmsSuppression = model<SmsSuppressionDocument>(
  'SmsSuppression', 
  SmsSuppressionSchema
);






// import { Model } from 'sequelize';

// interface SmsSuppressionAttributes {
//   id: number;
//   phone: string;
//   type: 'USER_INITIATED' | 'CARRIER';
//   expiresAt: Date;
// }

// export class SmsSuppression extends Model<SmsSuppressionAttributes> implements SmsSuppressionAttributes {
//   public id!: number;
//   public phone!: string;
//   public type!: 'USER_INITIATED' | 'CARRIER';
//   public expiresAt!: Date;
// }