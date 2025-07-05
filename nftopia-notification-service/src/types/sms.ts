export type NotificationType = 'bidAlert' | 'marketing' | '2fa' | 'nftPurchase';

export interface SMSRateLimitConfig {
  bidAlert: { limit: number; window: number; bypassable: boolean };
  marketing: { limit: number; window: number; bypassable: boolean };
  '2fa': { limit: number; window: number; bypassable: boolean };
  nftPurchase: { limit: number; window: number; bypassable: boolean };
}

export interface SendSMSRequest {
  to: string;
  userId: string;
  notificationType: NotificationType;
  message?: string;
  dynamicData?: Record<string, any>;
}

export interface SMSResponse {
  success: boolean;
  messageId?: string;
  error?: string;
  rateLimited?: boolean;
  remainingQuota?: number;
}

export interface RateLimitInfo {
  current: number;
  limit: number;
  window: number;
  resetTime: number;
  remaining: number;
}

export interface SMSConfig {
  accountSid: string;
  authToken: string;
  fromNumber: string;
  rateLimits: SMSRateLimitConfig;
  redis: {
    url: string;
    prefix: string;
  };
}

export interface AbuseAlert {
  userId: string;
  notificationType: NotificationType;
  attemptCount: number;
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
}

export interface SMSTemplate {
  bidAlert: string;
  marketing: string;
  '2fa': string;
  nftPurchase: string;
} 