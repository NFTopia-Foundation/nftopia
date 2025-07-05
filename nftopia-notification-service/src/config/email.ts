import { z } from 'zod';

const emailConfigSchema = z.object({
  SENDGRID_API_KEY: z.string().min(1, 'SendGrid API key is required'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  SENDGRID_WEBHOOK_SECRET: z.string().optional(),
});

const env = emailConfigSchema.parse(process.env);

export const sendGridConfig = {
  apiKey: env.SENDGRID_API_KEY,
  templates: {
    nftPurchase: process.env.SENDGRID_NFT_PURCHASE_TEMPLATE || 'd-123abc',
    bidAlert: process.env.SENDGRID_BID_ALERT_TEMPLATE || 'd-456def', 
    marketplaceAnnouncement: process.env.SENDGRID_MARKETPLACE_TEMPLATE || 'd-789ghi',
    passwordReset: process.env.SENDGRID_PASSWORD_RESET_TEMPLATE || 'd-abc123'
  },
  sandboxMode: env.NODE_ENV !== 'production',
  webhookSecret: env.SENDGRID_WEBHOOK_SECRET,
  webhook: {
    verificationToken: env.SENDGRID_WEBHOOK_SECRET,
    ipWhitelist: [
      '167.89.0.0/17',    // SendGrid Webhook IP range
      '149.72.0.0/16'     // Additional SendGrid IPs
    ],
    events: ['bounce', 'spamreport', 'blocked', 'delivered']
  },
  rateLimits: {
    requestsPerSecond: 10,
    burstLimit: 50,
    windowMs: 60000 
  },
  retryConfig: {
    maxRetries: 3,
    retryDelay: 1000, 
    exponentialBackoff: true
  }
};

export const emailSettings = {
  fromEmail: process.env.FROM_EMAIL || 'noreply@nftmarketplace.com',
  fromName: process.env.FROM_NAME || 'NFT Marketplace',
  replyTo: process.env.REPLY_TO_EMAIL || 'support@nftmarketplace.com'
};
