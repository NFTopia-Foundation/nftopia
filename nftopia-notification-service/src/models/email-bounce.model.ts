import { Schema, model, Document } from 'mongoose';

/**
 * Represents a bounce event from SendGrid
 */
interface IBounceEvent extends Document {
  email: string;
  timestamp: Date;
  eventType: 'bounce' | 'spamreport' | 'blocked';
  bounceType?: 'hard' | 'soft';
  reason?: string;
  retryAttempts?: number;
  resolved: boolean;
}

const BounceEventSchema = new Schema<IBounceEvent>({
  email: { 
    type: String, 
    required: true,
    index: true,
    validate: {
      validator: (v: string) => /.+@.+\..+/.test(v),
      message: (props: any) => `${props.value} is not a valid email address`
    }
  },
  timestamp: { 
    type: Date, 
    required: true,
    default: Date.now 
  },
  eventType: { 
    type: String, 
    required: true,
    enum: ['bounce', 'spamreport', 'blocked']
  },
  bounceType: { 
    type: String, 
    enum: ['hard', 'soft'],
    required: function(this: IBounceEvent) {
      return this.eventType === 'bounce';
    }
  },
  reason: { 
    type: String 
  },
  retryAttempts: {
    type: Number,
    default: 0,
    min: 0,
    max: 3
  },
  resolved: {
    type: Boolean,
    default: false
  }
});

/**
 * Represents an email that should be suppressed from sending
 */
interface ISuppressedEmail extends Document {
  email: string;
  reason: string;
  suppressedAt: Date;
  source: 'bounce' | 'spam' | 'manual';
}

const SuppressedEmailSchema = new Schema<ISuppressedEmail>({
  email: { 
    type: String, 
    required: true,
    unique: true,
    index: true,
    validate: {
      validator: (v: string) => /.+@.+\..+/.test(v),
      message: (props: any) => `${props.value} is not a valid email address`
    }
  },
  reason: { 
    type: String, 
    required: true 
  },
  suppressedAt: { 
    type: Date, 
    default: Date.now 
  },
  source: { 
    type: String, 
    required: true,
    enum: ['bounce', 'spam', 'manual']
  }
});

/**
 * Analytics data for bounce events
 */
interface IBounceAnalytics extends Document {
  date: Date;
  hardBounces: number;
  softBounces: number;
  spamReports: number;
  blocks: number;
  totalDeliveries: number;
  bounceRate: number;
}

const BounceAnalyticsSchema = new Schema<IBounceAnalytics>({
  date: { 
    type: Date, 
    required: true,
    unique: true,
    index: true 
  },
  hardBounces: { 
    type: Number, 
    default: 0,
    min: 0 
  },
  softBounces: { 
    type: Number, 
    default: 0,
    min: 0 
  },
  spamReports: { 
    type: Number, 
    default: 0,
    min: 0 
  },
  blocks: { 
    type: Number, 
    default: 0,
    min: 0 
  },
  totalDeliveries: { 
    type: Number, 
    required: true,
    min: 0 
  },
  bounceRate: { 
    type: Number, 
    default: 0,
    min: 0,
    max: 100 
  }
});

// Compound index for bounce events
BounceEventSchema.index({ email: 1, timestamp: 1 });

// Pre-save hook for analytics to calculate bounce rate
BounceAnalyticsSchema.pre<IBounceAnalytics>('save', function(next) {
  const totalEvents = this.hardBounces + this.softBounces + this.spamReports + this.blocks;
  this.bounceRate = totalEvents > 0 
    ? Math.round((totalEvents / (totalEvents + this.totalDeliveries)) * 100)
    : 0;
  next();
});

// Export models
export const BounceEvent = model<IBounceEvent>('BounceEvent', BounceEventSchema);
export const SuppressedEmail = model<ISuppressedEmail>('SuppressedEmail', SuppressedEmailSchema);
export const BounceAnalytics = model<IBounceAnalytics>('BounceAnalytics', BounceAnalyticsSchema);

/**
 * Helper types for working with bounce data
 */
export type BounceEventData = Omit<IBounceEvent, keyof Document>;
export type SuppressedEmailData = Omit<ISuppressedEmail, keyof Document>;
export type BounceAnalyticsData = Omit<IBounceAnalytics, keyof Document>;
