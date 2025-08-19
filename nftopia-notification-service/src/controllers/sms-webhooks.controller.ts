// import { Request, Response } from 'express';
// import { logger } from '../utils/logger';
// import redisService from '../services/redisService';
// import { EmailService } from '../services/email.service';
// import { TwilioWebhookPayload } from '../types/sms';

// /**
//  * Streamlined SMS Webhooks Controller
//  * Handles Twilio error webhooks with automatic retry and email fallback
//  */
// export class SMSWebhooksController {
//   private emailService = new EmailService();

//   /**
//    * Handle Twilio SMS status webhook
//    * @Post('/sms/status')
//    */
//   async handleStatus(req: Request, res: Response): Promise<void> {
//     try {
//       const payload: TwilioWebhookPayload = req.body;

//       logger.info(`SMS webhook: ${payload.MessageSid} - ${payload.MessageStatus}`, {
//         to: payload.To,
//         errorCode: payload.ErrorCode
//       });

//       // Only process failures
//       if (payload.MessageStatus === 'failed' && payload.ErrorCode) {
//         await this.processFailure(payload);
//       }

//       res.status(200).json({ success: true });

//     } catch (error) {
//       logger.error('SMS webhook error:', error);
//       res.status(500).json({ error: 'Internal server error' });
//     }
//   }

//   /**
//    * Process SMS failure based on error code
//    */
//   private async processFailure(payload: TwilioWebhookPayload): Promise<void> {
//     const { ErrorCode, MessageSid, To } = payload;

//     // Log failure
//     logger.warn(`SMS failed: ${MessageSid} to ${To}`, {
//       errorCode: ErrorCode,
//       errorMessage: payload.ErrorMessage
//     });

//     switch (ErrorCode) {
//       // Carrier errors - retry in 5 minutes
//       case '30003':
//       case '30004':
//       case '30005':
//       case '30006':
//         await this.scheduleRetry(MessageSid, To, 5 * 60 * 1000); // 5 minutes
//         break;

//       // Invalid number - disable contact  
//       case '21211':
//         await this.disableContact(To, 'invalid_number');
//         break;

//       // Spam/opt-out - immediate stop
//       case '21610':
//         await this.disableContact(To, 'spam');
//         break;

//       default:
//         logger.warn(`Unhandled error code: ${ErrorCode} for ${MessageSid}`);
//     }

//     // Check if this is a critical notification that needs email fallback
//     await this.checkEmailFallback(MessageSid, To);

//     // Track repeated failures for alerting
//     await this.trackFailure(To, ErrorCode || 'unknown');
//   }

//   /**
//    * Schedule SMS retry
//    */
//   private async scheduleRetry(messageSid: string, phoneNumber: string, delayMs: number): Promise<void> {
//     try {
//       const retryKey = `sms:retry:${messageSid}`;
//       const retryData = {
//         messageSid,
//         phoneNumber,
//         scheduledFor: new Date(Date.now() + delayMs),
//         attempt: 1
//       };

//       await redisService.set(retryKey, JSON.stringify(retryData), { PX: delayMs });

//       // Schedule the retry
//       setTimeout(async () => {
//         await this.processRetry(messageSid);
//       }, delayMs);

//       logger.info(`Scheduled retry for ${messageSid} in ${delayMs}ms`);
//     } catch (error) {
//       logger.error(`Error scheduling retry for ${messageSid}:`, error);
//     }
//   }

//   /**
//    * Process a scheduled retry
//    */
//   private async processRetry(messageSid: string): Promise<void> {
//     try {
//       const retryKey = `sms:retry:${messageSid}`;
//       const retryData = await redisService.get(retryKey);

//       if (!retryData) {
//         logger.debug(`Retry data not found for ${messageSid}`);
//         return;
//       }

//       const retry = JSON.parse(retryData);

//       // Check if contact is still active
//       const isDisabled = await redisService.get(`sms:disabled:${retry.phoneNumber}`);
//       if (isDisabled) {
//         logger.info(`Contact ${retry.phoneNumber} is disabled, skipping retry`);
//         return;
//       }

//       // Re-send SMS using existing SMS service
//       // const { smsService } = await import('../services/smsService');

//       // This would need the original request data - simplified for now
//       logger.info(`Processing retry for ${messageSid} to ${retry.phoneNumber}`);

//       // Clean up retry record
//       await redisService.del(retryKey);

//     } catch (error) {
//       logger.error(`Error processing retry for ${messageSid}:`, error);
//     }
//   }

//   /**
//    * Disable contact
//    */
//   private async disableContact(phoneNumber: string, reason: string): Promise<void> {
//     try {
//       const disableKey = `sms:disabled:${phoneNumber}`;
//       const disableData = {
//         phoneNumber,
//         reason,
//         disabledAt: new Date(),
//       };

//       await redisService.set(disableKey, JSON.stringify(disableData));

//       logger.info(`Disabled contact ${phoneNumber} due to ${reason}`);
//     } catch (error) {
//       logger.error(`Error disabling contact ${phoneNumber}:`, error);
//     }
//   }

//   /**
//    * Check if email fallback is needed for critical notifications
//    */
//   private async checkEmailFallback(messageSid: string, phoneNumber: string): Promise<void> {
//     try {
//       // Check if this is a critical notification (bidAlert or 2fa)
//       const notificationData = await this.getNotificationData(messageSid);

//       if (notificationData && this.isCriticalNotification(notificationData.type)) {
//         await this.sendEmailFallback(notificationData);
//         logger.info(`Email fallback sent for critical SMS ${messageSid}`);
//       }
//     } catch (error) {
//       logger.error(`Error checking email fallback for ${messageSid}:`, error);
//     }
//   }

//   /**
//    * Send email fallback for critical notifications
//    */
//   private async sendEmailFallback(notificationData: any): Promise<void> {
//     try {
//       const userEmail = await this.getUserEmail(notificationData.userId);
//       if (!userEmail) {
//         logger.warn(`No email found for user ${notificationData.userId}`);
//         return;
//       }

//       const subject = notificationData.type === 'bidAlert'
//         ? '[NFTopia] Bid Alert - Action Required'
//         : '[NFTopia] Two-Factor Authentication Code';

//       await this.emailService.sendEmailWithUnsubscribe({
//         to: userEmail,
//         template: 'sms-fallback',
//         subject,
//         isCritical: true
//       });

//       logger.info(`Email fallback sent to ${userEmail} for ${notificationData.type}`);
//     } catch (error) {
//       logger.error('Error sending email fallback:', error);
//     }
//   }

//   /**
//    * Track failures for real-time alerting
//    */
//   private async trackFailure(phoneNumber: string, errorCode: string): Promise<void> {
//     try {
//       const failureKey = `sms:failures:${phoneNumber}`;
//       const now = Date.now();

//       // Add failure with timestamp
//       await redisService.zAdd(failureKey, [{ score: now, value: errorCode }]);

//       // Keep only failures from last hour
//       const oneHourAgo = now - (60 * 60 * 1000);
//       await redisService.zRemRangeByScore(failureKey, 0, oneHourAgo);

//       // Check if we need to trigger an alert
//       const recentFailures = await redisService.zCard(failureKey);

//       if (recentFailures >= 3) {
//         await this.triggerFailureAlert(phoneNumber, recentFailures);
//       }

//     } catch (error) {
//       logger.error(`Error tracking failure for ${phoneNumber}:`, error);
//     }
//   }

//   /**
//    * Trigger real-time failure alert
//    */
//   private async triggerFailureAlert(phoneNumber: string, failureCount: number): Promise<void> {
//     try {
//       const alert = {
//         phoneNumber,
//         failureCount,
//         timestamp: new Date(),
//         type: 'repeated_failures'
//       };

//       // Store alert
//       await redisService.lPush('sms:alerts', JSON.stringify(alert));
//       await redisService.lTrim('sms:alerts', 0, 99); // Keep last 100 alerts

//       logger.error(`ALERT: ${failureCount} SMS failures for ${phoneNumber} in last hour`, alert);

//       // In production, you could send this to your monitoring system:
//       // await this.sendToMonitoring(alert);

//     } catch (error) {
//       logger.error(`Error triggering alert for ${phoneNumber}:`, error);
//     }
//   }

//   /**
//    * Helper methods
//    */
//   private async getNotificationData(messageSid: string): Promise<any> {
//     // This would query your notification system to get the original notification
//     // For now, returning mock data
//     return {
//       messageSid,
//       type: 'bidAlert', // or '2fa'
//       userId: 'user123'
//     };
//   }

//   private isCriticalNotification(type: string): boolean {
//     return ['bidAlert', '2fa'].includes(type);
//   }

//   private async getUserEmail(userId: string): Promise<string | null> {
//     // This would integrate with your user service
//     // For now, returning a placeholder
//     return `user${userId}@example.com`;
//   }
// }

// export const smsWebhooksController = new SMSWebhooksController();
