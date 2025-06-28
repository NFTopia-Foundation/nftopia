import sgMail from '@sendgrid/mail';
import { sendGridConfig, emailSettings } from '../config/email';
import { 
  SendEmailRequest, 
  EmailResponse, 
  NFTPurchaseData, 
  BidAlertData, 
  MarketplaceAnnouncementData, 
  PasswordResetData,
  EmailStats
} from '../types/email';

class EmailService {
  private rateLimitStore: Map<string, { count: number; resetTime: number }> = new Map();
  
  constructor() {
    sgMail.setApiKey(sendGridConfig.apiKey);
  }

  /**
   * Rate limiting check
   */
  private checkRateLimit(identifier: string): boolean {
    const now = Date.now();
    const limit = this.rateLimitStore.get(identifier);
    
    if (!limit || now > limit.resetTime) {
      this.rateLimitStore.set(identifier, {
        count: 1,
        resetTime: now + sendGridConfig.rateLimits.windowMs
      });
      return true;
    }
    
    if (limit.count >= sendGridConfig.rateLimits.requestsPerSecond) {
      return false;
    }
    
    limit.count++;
    return true;
  }

  /**
   * Retry mechanism with exponential backoff
   */
  private async retryRequest<T>(
    operation: () => Promise<T>,
    retries: number = sendGridConfig.retryConfig.maxRetries
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (retries <= 0) {
        throw error;
      }
      
      const delay = sendGridConfig.retryConfig.exponentialBackoff 
        ? sendGridConfig.retryConfig.retryDelay * Math.pow(2, sendGridConfig.retryConfig.maxRetries - retries)
        : sendGridConfig.retryConfig.retryDelay;
      
      await this.delay(delay);
      return this.retryRequest(operation, retries - 1);
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Send NFT purchase confirmation email
   */
  async sendNFTPurchaseConfirmation(data: NFTPurchaseData): Promise<EmailResponse> {
    return this.sendTemplatedEmail({
      to: data.buyerEmail,
      templateType: 'nftPurchase',
      dynamicData: data,
      subject: `NFT Purchase Confirmed - ${data.nftName}`
    });
  }

  /**
   * Send bid activity alert
   */
  async sendBidAlert(data: BidAlertData): Promise<EmailResponse> {
    return this.sendTemplatedEmail({
      to: data.userEmail,
      templateType: 'bidAlert',
      dynamicData: data,
      subject: `New Bid Activity - ${data.nftName}`
    });
  }

  /**
   * Send marketplace announcement
   */
  async sendMarketplaceAnnouncement(data: MarketplaceAnnouncementData): Promise<EmailResponse> {
    return this.sendTemplatedEmail({
      to: data.userEmail,
      templateType: 'marketplaceAnnouncement',
      dynamicData: data,
      subject: data.subject || data.announcementTitle
    });
  }

  /**
   * Send password reset email
   */
  async sendPasswordReset(data: PasswordResetData): Promise<EmailResponse> {
    return this.sendTemplatedEmail({
      to: data.userEmail,
      templateType: 'passwordReset',
      dynamicData: data,
      subject: 'Password Reset Request - NFT Marketplace'
    });
  }

  /**
   * Core templated email sending method
   */
  private async sendTemplatedEmail(request: SendEmailRequest): Promise<EmailResponse> {
    try {
      // Rate limiting check
      if (!this.checkRateLimit(request.to)) {
        throw new Error('Rate limit exceeded for recipient');
      }

      const templateId = sendGridConfig.templates[request.templateType];
      if (!templateId) {
        throw new Error(`Template not found for type: ${request.templateType}`);
      }

      const msg = {
        to: request.to,
        from: {
          email: emailSettings.fromEmail,
          name: emailSettings.fromName
        },
        replyTo: emailSettings.replyTo,
        templateId,
        dynamicTemplateData: {
          ...request.dynamicData,
          subject: request.subject
        },
        mailSettings: {
          sandboxMode: {
            enable: sendGridConfig.sandboxMode
          }
        },
        trackingSettings: {
          clickTracking: {
            enable: true,
            enableText: false
          },
          openTracking: {
            enable: true,
            substitutionTag: '%open-track%'
          }
        }
      };

      const response = await this.retryRequest(() => sgMail.send(msg));
      // Assert response type to match SendGrid's expected response structure
      const sendGridResponse = response as unknown as [{ headers?: Record<string, any> }];
      
      return {
        success: true,
        messageId: sendGridResponse[0]?.headers?.['x-message-id'] || 'unknown'
      };

    } catch (error: any) {
      console.error('SendGrid Error:', {
        error: error.message,
        response: error.response?.body,
        recipient: request.to,
        templateType: request.templateType
      });

      return {
        success: false,
        error: this.formatError(error)
      };
    }
  }

  /**
   * Send bulk emails with batch processing
   */
  async sendBulkEmails(requests: SendEmailRequest[]): Promise<EmailResponse[]> {
    const batchSize = 100; // SendGrid batch limit
    const results: EmailResponse[] = [];

    for (let i = 0; i < requests.length; i += batchSize) {
      const batch = requests.slice(i, i + batchSize);
      const batchPromises = batch.map(request => this.sendTemplatedEmail(request));
      const batchResults = await Promise.allSettled(batchPromises);
      
      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          results.push({
            success: false,
            error: `Batch processing failed: ${result.reason}`
          });
        }
      });
    }

    return results;
  }

  /**
   * Get email statistics (would typically integrate with SendGrid Stats API)
   */
  async getEmailStats(startDate: Date, endDate: Date): Promise<EmailStats> {
    // This would typically make API calls to SendGrid's Stats API
    // For now, returning mock data structure
    return {
      delivered: 0,
      opens: 0,
      clicks: 0,
      bounces: 0,  
      unsubscribes: 0,
      spamReports: 0
    };
  }

  /**
   * Validate email template exists
   */
  async validateTemplate(templateId: string): Promise<boolean> {
    try {
      // This would make an API call to validate template exists
      // SendGrid doesn't have a direct template validation endpoint
      // so this is a placeholder for custom validation logic
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Format error messages for consistent error handling
   */
  private formatError(error: any): string {
    if (error.response?.body?.errors) {
      return error.response.body.errors.map((err: any) => err.message).join(', ');
    }
    
    if (error.response?.body?.error) {
      return error.response.body.error;
    }
    
    return error.message || 'Unknown email service error';
  }

  /**
   * Health check for SendGrid service
   */
  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; details?: string }> {
    try {
      // Simple API key validation by attempting to send to a test template
      const testMsg = {
        to: 'test@example.com',
        from: emailSettings.fromEmail,
        subject: 'Health Check',
        text: 'Health check email',
        mailSettings: {
          sandboxMode: {
            enable: true
          }
        }
      };

      await sgMail.send(testMsg);
      return { status: 'healthy' };
    } catch (error: any) {
      return { 
        status: 'unhealthy', 
        details: this.formatError(error) 
      };
    }
  }
}

export const emailService = new EmailService();