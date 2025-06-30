import { z } from 'zod';
import { SMSConfig, SMSRateLimitConfig } from '../types/sms';

const smsConfigSchema = z.object({
  TWILIO_ACCOUNT_SID: z.string().optional().default(''),
  TWILIO_AUTH_TOKEN: z.string().optional().default(''),
  TWILIO_FROM_NUMBER: z.string().optional().default(''),
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
  accountSid: env.TWILIO_ACCOUNT_SID || '',
  authToken: env.TWILIO_AUTH_TOKEN || '',
  fromNumber: env.TWILIO_FROM_NUMBER || '',
  rateLimits,
  redis: {
    url: env.REDIS_URL,
    prefix: env.REDIS_PREFIX,
  },
};

export const smsTemplates = {
  bidAlert: 'New bid of {bidAmount} on {nftName}. Current highest: {currentHighestBid}. Auction ends: {auctionEndDate}',
  marketing: '{announcementTitle}: {announcementContent}',
  '2fa': 'Your NFTopia verification code is: {code}. Valid for 10 minutes.',
  nftPurchase: 'NFT Purchase Confirmed! You bought {nftName} for {purchasePrice}. Transaction: {transactionHash}',
};

export const smsSettings = {
  maxRetries: 3,
  retryDelay: 1000,
  exponentialBackoff: true,
  sandboxMode: env.NODE_ENV !== 'production',
}; 