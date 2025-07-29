import { Request, Response, NextFunction } from 'express';
import redisService from '../services/redisService';
import { NotificationType } from '../types/sms';

interface RateLimitOptions {
  notificationType: NotificationType;
  bypassable?: boolean;
}

/**
 * SMS Rate Limiting Middleware Factory
 * Creates rate limit middleware with proper TypeScript typing
 */
export const smsRateLimit = (options: RateLimitOptions) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.body.userId || req.params.userId;
      
      if (!userId) {
        res.status(400).json({
          success: false,
          error: 'User ID is required for rate limiting',
        });
        return;
      }

      // Check if rate limited
      const isRateLimited = await redisService.isRateLimited(userId, options.notificationType);
      
      if (isRateLimited && !options.bypassable) {
        const rateLimitInfo = await redisService.getRateLimitInfo(userId, options.notificationType);
        
        res.status(429).json({
          success: false,
          error: 'Rate limit exceeded',
          rateLimited: true,
          remainingQuota: rateLimitInfo.remaining,
          retryAfter: options.notificationType === 'marketing' ? '24 hours' : '1 hour',
        });
        return;
      }

      next();
    } catch (error) {
      console.error('Rate Limit Middleware Error:', error);
      next(error);
    }
  };
};

/**
 * Specific rate limit middlewares for different notification types
 * Now with proper TypeScript return type annotations
 */
export const bidAlertRateLimit: (req: Request, res: Response, next: NextFunction) => Promise<void> 
  = smsRateLimit({ notificationType: 'bidAlert' });

export const marketingRateLimit: (req: Request, res: Response, next: NextFunction) => Promise<void>
  = smsRateLimit({ notificationType: 'marketing' });

export const twoFARateLimit: (req: Request, res: Response, next: NextFunction) => Promise<void>
  = smsRateLimit({ notificationType: '2fa', bypassable: true });

export const nftPurchaseRateLimit: (req: Request, res: Response, next: NextFunction) => Promise<void>
  = smsRateLimit({ notificationType: 'nftPurchase', bypassable: true });
