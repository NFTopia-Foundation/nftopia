import twilio from 'twilio';
import { smsConfig, smsTemplates, smsSettings } from '../config/sms';
import redisService from './redisService';
import { 
  SendSMSRequest, 
  SMSResponse, 
  NotificationType, 
  RateLimitInfo,
  AbuseAlert 
} from '../types/sms';

class SMSService {
  private client: twilio.Twilio;
  private isInitialized = false;

  constructor() {
    this.client = twilio(smsConfig.accountSid, smsConfig.authToken);
  }

  /**
   * Initialize the service
   */
  async initialize(): Promise<void> {
    if (!this.isInitialized) {
      await redisService.connect();
      this.isInitialized = true;
    }
  }

  /**
   * Format message with dynamic data
   */
  private formatMessage(template: string, dynamicData?: Record<string, any>): string {
    if (!dynamicData) return template;
    
    return template.replace(/\{(\w+)\}/g, (match, key) => {
      return dynamicData[key] || match;
    });
  }

  /**
   * Retry mechanism with exponential backoff
   */
  private async retryRequest<T>(
    operation: () => Promise<T>,
    retries: number = smsSettings.maxRetries
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (retries <= 0) {
        throw error;
      }
      
      const delay = smsSettings.exponentialBackoff 
        ? smsSettings.retryDelay * Math.pow(2, smsSettings.maxRetries - retries)
        : smsSettings.retryDelay;
      
      await this.delay(delay);
      return this.retryRequest(operation, retries - 1);
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Send SMS with rate limiting
   */
  async sendSMS(request: SendSMSRequest): Promise<SMSResponse> {
    try {
      await this.initialize();

      // Check rate limit
      const isRateLimited = await redisService.isRateLimited(request.userId, request.notificationType);
      
      if (isRateLimited) {
        // Record abuse attempt for non-bypassable types
        const config = smsConfig.rateLimits[request.notificationType];
        if (!config.bypassable) {
          await this.recordAbuseAttempt(request);
        }

        const rateLimitInfo = await redisService.getRateLimitInfo(request.userId, request.notificationType);
        
        return {
          success: false,
          error: 'Rate limit exceeded',
          rateLimited: true,
          remainingQuota: rateLimitInfo.remaining,
        };
      }

      // Format message
      const template = smsTemplates[request.notificationType];
      const formattedMessage = this.formatMessage(template, request.dynamicData);

      // Send SMS via Twilio
      const message = await this.retryRequest(() => 
        this.client.messages.create({
          body: formattedMessage,
          from: smsConfig.fromNumber,
          to: request.to,
        })
      );

      return {
        success: true,
        messageId: message.sid,
        remainingQuota: await this.getRemainingQuota(request.userId, request.notificationType),
      };

    } catch (error: any) {
      console.error('SMS Error:', {
        error: error.message,
        recipient: request.to,
        notificationType: request.notificationType,
        userId: request.userId,
      });

      return {
        success: false,
        error: this.formatError(error),
      };
    }
  }

  /**
   * Send bid alert SMS
   */
  async sendBidAlert(userId: string, to: string, data: {
    bidAmount: string;
    nftName: string;
    currentHighestBid: string;
    auctionEndDate: string;
  }): Promise<SMSResponse> {
    return this.sendSMS({
      to,
      userId,
      notificationType: 'bidAlert',
      message: smsTemplates.bidAlert,
      dynamicData: data,
    });
  }

  /**
   * Send marketing SMS
   */
  async sendMarketing(userId: string, to: string, data: {
    announcementTitle: string;
    announcementContent: string;
  }): Promise<SMSResponse> {
    return this.sendSMS({
      to,
      userId,
      notificationType: 'marketing',
      message: smsTemplates.marketing,
      dynamicData: data,
    });
  }

  /**
   * Send 2FA SMS
   */
  async send2FA(userId: string, to: string, data: {
    code: string;
  }): Promise<SMSResponse> {
    return this.sendSMS({
      to,
      userId,
      notificationType: '2fa',
      message: smsTemplates['2fa'],
      dynamicData: data,
    });
  }

  /**
   * Send NFT purchase confirmation SMS
   */
  async sendNFTPurchase(userId: string, to: string, data: {
    nftName: string;
    purchasePrice: string;
    transactionHash: string;
  }): Promise<SMSResponse> {
    return this.sendSMS({
      to,
      userId,
      notificationType: 'nftPurchase',
      message: smsTemplates.nftPurchase,
      dynamicData: data,
    });
  }

  /**
   * Get remaining quota for a user
   */
  async getRemainingQuota(userId: string, notificationType: NotificationType): Promise<number> {
    const rateLimitInfo = await redisService.getRateLimitInfo(userId, notificationType);
    return rateLimitInfo.remaining;
  }

  /**
   * Get rate limit info for a user
   */
  async getRateLimitInfo(userId: string, notificationType: NotificationType): Promise<RateLimitInfo> {
    return redisService.getRateLimitInfo(userId, notificationType);
  }

  /**
   * Record abuse attempt
   */
  private async recordAbuseAttempt(request: SendSMSRequest): Promise<void> {
    const abuseAlert: AbuseAlert = {
      userId: request.userId,
      notificationType: request.notificationType,
      attemptCount: 1,
      timestamp: new Date(),
    };

    await redisService.recordAbuseAttempt(abuseAlert);
  }

  /**
   * Get abuse attempts for a user
   */
  async getAbuseAttempts(userId: string, notificationType: NotificationType): Promise<AbuseAlert[]> {
    return redisService.getAbuseAttempts(userId, notificationType);
  }

  /**
   * Format error message
   */
  private formatError(error: any): string {
    if (error.code === 21211) {
      return 'Invalid phone number format';
    } else if (error.code === 21608) {
      return 'Message content rejected';
    } else if (error.code === 21614) {
      return 'Invalid phone number';
    } else if (error.code === 30007) {
      return 'Message delivery failed';
    } else {
      return error.message || 'Unknown SMS error';
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; details?: string }> {
    try {
      const redisHealth = await redisService.healthCheck();
      if (redisHealth.status === 'unhealthy') {
        return redisHealth;
      }

      // Test Twilio connection
      await this.client.api.accounts(smsConfig.accountSid).fetch();
      
      return { status: 'healthy' };
    } catch (error) {
      return { 
        status: 'unhealthy', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Cleanup
   */
  async cleanup(): Promise<void> {
    await redisService.disconnect();
  }
}

export default new SMSService(); 