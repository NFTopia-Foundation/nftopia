import { z } from 'zod';
import { SMSConfig, SMSRateLimitConfig } from '../types/sms';

const smsConfigSchema = z.object({
  TWILIO_ACCOUNT_SID: z.string().min(1, 'Twilio Account SID is required'),
  TWILIO_AUTH_TOKEN: z.string().min(1, 'Twilio Auth Token is required'),
  TWILIO_FROM_NUMBER: z.string().min(1, 'Twilio From Number is required'),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  REDIS_PREFIX: z.string().default('nftopia:sms'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

const env = smsConfigSchema.parse(process.env);

// Rate limit configuration as per requirements
const rateLimits: SMSRateLimitConfig = {
  bidAlert: { limit: 5, window: 3600, bypassable: false }, // 5 per hour
  marketing: { limit: 2, window: 86400, bypassable: false }, // 2 per 24h
  '2fa': { limit: -1, window: 0, bypassable: true }, // Unlimited, bypassable
  nftPurchase: { limit: -1, window: 0, bypassable: true }, // Unlimited, bypassable
};

export const smsConfig: SMSConfig = {
  accountSid: env.TWILIO_ACCOUNT_SID,
  authToken: env.TWILIO_AUTH_TOKEN,
  fromNumber: env.TWILIO_FROM_NUMBER,
  rateLimits,
  redis: {
    url: env.REDIS_URL,
    prefix: env.REDIS_PREFIX,
  },
};

export const twilioConfig = {
  accountSid: process.env.TWILIO_ACCOUNT_SID!,
  authToken: process.env.TWILIO_AUTH_TOKEN!,
  phoneNumber: process.env.TWILIO_PHONE_NUMBER!,
  webhookUrl: `${process.env.API_URL}/sms/webhooks`,
  maxLength: 320,
  rateLimit: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10 // 10 messages/hour/user
  }
};

export const smsTemplates = {
  bidAlert: {
    en: '[NFTopia] Outbid on {{nft.name}} ({{formatEth oldBid}} → {{formatEth newBid}}). {{truncateTx txHash}}',
  },
  marketing: {
    en: '[NFTopia] {{announcementTitle}}: {{announcementContent}}',
  },
  '2fa': {
    en: '[NFTopia] Your code: {{code}}. Expires in {{minutes}}m.',
  },
  nftPurchase: {
    en: '[NFTopia] Purchased {{nft.name}} for {{formatEth price}}. View: {{blockExplorer nft.id}}',
  },
};

export const smsSettings = {
  maxRetries: 3,
  retryDelay: 1000,
  exponentialBackoff: true,
  sandboxMode: env.NODE_ENV !== 'production',
}; 
