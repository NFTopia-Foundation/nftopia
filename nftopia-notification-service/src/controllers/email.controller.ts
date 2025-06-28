import { Request, Response } from 'express';
import crypto from 'crypto';
import { sendGridConfig } from '../config/email';
import { WebhookEvent } from '../types/email';
import { emailService } from '../services/emailService';

class EmailController {
  /**
   * Handle SendGrid webhook events
   */
  async handleWebhook(req: Request, res: Response): Promise<void> {
    try {
      // Verify webhook signature if secret is configured
      if (sendGridConfig.webhookSecret) {
        const isValid = this.verifyWebhookSignature(req);
        if (!isValid) {
          res.status(401).json({ error: 'Invalid webhook signature' });
          return;
        }
      }

      const events: WebhookEvent[] = req.body;
      
      if (!Array.isArray(events)) {
        res.status(400).json({ error: 'Invalid webhook payload format' });
        return;
      }

      // Process each webhook event
      const processedEvents = await Promise.allSettled(
        events.map(event => this.processWebhookEvent(event))
      );

      const successCount = processedEvents.filter(result => result.status === 'fulfilled').length;
      const errorCount = processedEvents.length - successCount;

      console.log(`Processed ${successCount} webhook events successfully, ${errorCount} errors`);

      res.status(200).json({ 
        message: 'Webhook processed successfully',
        processed: successCount,
        errors: errorCount
      });

    } catch (error: any) {
      console.error('Webhook processing error:', error);
      res.status(500).json({ error: 'Internal server error processing webhook' });
    }
  }

  /**
   * Send NFT purchase confirmation email
   */
  async sendPurchaseConfirmation(req: Request, res: Response): Promise<void> {
    try {
      const { buyerEmail, buyerName, nftName, nftImage, purchasePrice, transactionHash, sellerName } = req.body;

      if (!buyerEmail || !buyerName || !nftName || !purchasePrice || !transactionHash) {
        res.status(400).json({ error: 'Missing required fields' });
        return;
      }

      const result = await emailService.sendNFTPurchaseConfirmation({
        buyerEmail,
        buyerName,
        nftName,
        nftImage,
        purchasePrice,
        transactionHash,
        purchaseDate: new Date(),
        sellerName
      });

      if (result.success) {
        res.status(200).json({ 
          message: 'Purchase confirmation sent successfully',
          messageId: result.messageId 
        });
      } else {
        res.status(500).json({ 
          error: 'Failed to send email',
          details: result.error 
        });
      }

    } catch (error: any) {
      console.error('Send purchase confirmation error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Send bid alert notification
   */
  async sendBidAlert(req: Request, res: Response): Promise<void> {
    try {
      const { 
        userEmail, 
        userName, 
        nftName, 
        nftImage, 
        bidAmount, 
        currentHighestBid,
        auctionEndDate,
        bidderName 
      } = req.body;

      if (!userEmail || !userName || !nftName || !bidAmount || !auctionEndDate || !bidderName) {
        res.status(400).json({ error: 'Missing required fields' });
        return;
      }

      const result = await emailService.sendBidAlert({
        userEmail,
        userName,
        nftName,
        nftImage,
        bidAmount,
        currentHighestBid,
        auctionEndDate: new Date(auctionEndDate),
        bidderName
      });

      if (result.success) {
        res.status(200).json({ 
          message: 'Bid alert sent successfully',
          messageId: result.messageId 
        });
      } else {
        res.status(500).json({ 
          error: 'Failed to send email',
          details: result.error 
        });
      }

    } catch (error: any) {
      console.error('Send bid alert error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Send marketplace announcement
   */
  async sendAnnouncement(req: Request, res: Response): Promise<void> {
    try {
      const { 
        recipients, 
        subject, 
        announcementTitle, 
        announcementContent,
        actionUrl,
        actionText 
      } = req.body;

      if (!recipients || !Array.isArray(recipients) || !subject || !announcementTitle || !announcementContent) {
        res.status(400).json({ error: 'Missing required fields or invalid recipients format' });
        return;
      }

      const emailRequests = recipients.map((recipient: any) => ({
        to: recipient.email,
        templateType: 'marketplaceAnnouncement' as const,
        dynamicData: {
          userEmail: recipient.email,
          userName: recipient.name || 'Valued Customer',
          subject,
          announcementTitle,
          announcementContent,
          actionUrl,
          actionText
        },
        subject
      }));

      const results = await emailService.sendBulkEmails(emailRequests);
      const successCount = results.filter(r => r.success).length;
      const errorCount = results.length - successCount;

      res.status(200).json({ 
        message: 'Announcement emails processed',
        sent: successCount,
        failed: errorCount,
        total: results.length
      });

    } catch (error: any) {
      console.error('Send announcement error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Send password reset email
   */
  async sendPasswordReset(req: Request, res: Response): Promise<void> {
    try {
      const { userEmail, userName, resetToken, resetUrl, expiryTime } = req.body;

      if (!userEmail || !userName || !resetToken || !resetUrl) {
        res.status(400).json({ error: 'Missing required fields' });
        return;
      }

      const result = await emailService.sendPasswordReset({
        userEmail,
        userName,
        resetToken,
        resetUrl,
        expiryTime: expiryTime ? new Date(expiryTime) : new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours default
      });

      if (result.success) {
        res.status(200).json({ 
          message: 'Password reset email sent successfully',
          messageId: result.messageId 
        });
      } else {
        res.status(500).json({ 
          error: 'Failed to send email',
          details: result.error 
        });
      }

    } catch (error: any) {
      console.error('Send password reset error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Get email service health status
   */
  async getHealthStatus(req: Request, res: Response): Promise<void> {
    try {
      const health = await emailService.healthCheck();
      const statusCode = health.status === 'healthy' ? 200 : 503;
      
      res.status(statusCode).json(health);
    } catch (error: any) {
      console.error('Health check error:', error);
      res.status(503).json({ 
        status: 'unhealthy', 
        details: 'Health check failed' 
      });
    }
  }

  /**
   * Get email statistics
   */
  async getEmailStats(req: Request, res: Response): Promise<void> {
    try {
      const { startDate, endDate } = req.query;
      
      const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const end = endDate ? new Date(endDate as string) : new Date();

      const stats = await emailService.getEmailStats(start, end);
      
      res.status(200).json({
        stats,
        dateRange: {
          startDate: start,
          endDate: end
        }
      });
    } catch (error: any) {
      console.error('Get email stats error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Verify SendGrid webhook signature
   */
  private verifyWebhookSignature(req: Request): boolean {
    try {
      const signature = req.headers['x-twilio-email-event-webhook-signature'] as string;
      const timestamp = req.headers['x-twilio-email-event-webhook-timestamp'] as string;
      
      if (!signature || !timestamp || !sendGridConfig.webhookSecret) {
        return false;
      }

      const payload = JSON.stringify(req.body);
      const timestampPayload = timestamp + payload;
      
      const expectedSignature = crypto
        .createHmac('sha256', sendGridConfig.webhookSecret)
        .update(timestampPayload)
        .digest('base64');

      return crypto.timingSafeEqual(
        Buffer.from(signature, 'base64'),
        Buffer.from(expectedSignature, 'base64')
      );
    } catch (error) {
      console.error('Webhook signature verification error:', error);
      return false;
    }
  }

  /**
   * Process individual webhook event
   */
  private async processWebhookEvent(event: WebhookEvent): Promise<void> {
    try {
      console.log(`Processing webhook event: ${event.event} for ${event.email}`);
      
      // Handle different event types
      switch (event.event) {
        case 'delivered':
          await this.handleDeliveredEvent(event);
          break;
        case 'open':
          await this.handleOpenEvent(event);
          break;
        case 'click':
          await this.handleClickEvent(event);
          break;
        case 'bounce':
          await this.handleBounceEvent(event);
          break;
        case 'unsubscribe':
          await this.handleUnsubscribeEvent(event);
          break;
        case 'spamreport':
          await this.handleSpamReportEvent(event);
          break;
        default:
          console.log(`Unhandled event type: ${event.event}`);
      }
    } catch (error) {
      console.error(`Error processing webhook event ${event.event}:`, error);
      throw error;
    }
  }

  private async handleDeliveredEvent(event: WebhookEvent): Promise<void> {
    // Update delivery status in database
    console.log(`Email delivered to ${event.email} at ${new Date(event.timestamp * 1000)}`);
  }

  private async handleOpenEvent(event: WebhookEvent): Promise<void> {
    // Track email opens
    console.log(`Email opened by ${event.email} at ${new Date(event.timestamp * 1000)}`);
  }

  private async handleClickEvent(event: WebhookEvent): Promise<void> {
    // Track link clicks
    console.log(`Link clicked by ${event.email}: ${event.url} at ${new Date(event.timestamp * 1000)}`);
  }

  private async handleBounceEvent(event: WebhookEvent): Promise<void> {
    // Handle bounced emails - might need to mark email as invalid
    console.log(`Email bounced for ${event.email}: ${event.reason}`);
  }

  private async handleUnsubscribeEvent(event: WebhookEvent): Promise<void> {
    // Handle unsubscribe requests
    console.log(`User unsubscribed: ${event.email}`);
  }

  private async handleSpamReportEvent(event: WebhookEvent): Promise<void> {
    // Handle spam reports
    console.log(`Spam report from ${event.email}`);
  }
}

export const emailController = new EmailController();