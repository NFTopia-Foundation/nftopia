import { Request, Response, NextFunction } from 'express';
import redisService from '../services/redisService';
import { NotificationType } from '../types/sms';

interface RateLimitOptions {
  notificationType: NotificationType;
  bypassable?: boolean;
}

/**
 * SMS Rate Limiting Middleware
 * Can be used to add additional rate limiting at the HTTP level
 */
export const smsRateLimit = (options: RateLimitOptions) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.body.userId || req.params.userId;
      
      if (!userId) {
        return res.status(400).json({
          success: false,
          error: 'User ID is required for rate limiting',
        });
      }

      // Check if rate limited
      const isRateLimited = await redisService.isRateLimited(userId, options.notificationType);
      
      if (isRateLimited && !options.bypassable) {
        const rateLimitInfo = await redisService.getRateLimitInfo(userId, options.notificationType);
        
        return res.status(429).json({
          success: false,
          error: 'Rate limit exceeded',
          rateLimited: true,
          remainingQuota: rateLimitInfo.remaining,
          retryAfter: options.notificationType === 'marketing' ? '24 hours' : '1 hour',
        });
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
 */
export const bidAlertRateLimit = smsRateLimit({ notificationType: 'bidAlert' });
export const marketingRateLimit = smsRateLimit({ notificationType: 'marketing' });
export const twoFARateLimit = smsRateLimit({ notificationType: '2fa', bypassable: true });
export const nftPurchaseRateLimit = smsRateLimit({ notificationType: 'nftPurchase', bypassable: true }); 