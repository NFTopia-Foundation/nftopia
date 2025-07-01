import { NotificationStorageService } from './NotificationStorageService';
import { INotification } from '../types/notification.types';

export class NotificationService {
  private static storageService = new NotificationStorageService();

  /**
   * Sends email and logs to database
   * @param to Recipient email
   * @param message Email content
   * @param userId User ID for reference
   */
  static async sendEmail(to: string, message: string, userId: string) {
    let notification: INotification | null = null;
    
    try {
      // Create notification record first
      const { success, data: notificationData } = await this.storageService.createAndSendNotification({
        userId,
        type: 'email',
        content: message,
        recipient: to,
        status: 'pending'
      });

      if (!success || !notificationData) {
        throw new Error('Failed to create notification record');
      }

      notification = notificationData;

      // Original send logic
      console.log(`[Email] to ${to}: ${message}`);
      
      // Update status to sent
      await this.storageService.updateStatus(notification._id!.toString(), 'sent');
     
      return true;
    } catch (error) {
      console.error(`Email failed to ${to}:`, error);
     
      // Update status to failed if we have a notification ID
      if (notification?._id) {
        await this.storageService.updateStatus(notification._id.toString(), 'failed');
      }
     
      throw error;
    }
  }

  /**
   * Placeholder for SMS notification
   */
  static async sendSMS(to: string, message: string, userId: string) {
    let notification: INotification | null = null;
    
    try {
      const { success, data: notificationData } = await this.storageService.createAndSendNotification({
        userId,
        type: 'sms',
        content: message,
        recipient: to,
        status: 'pending'
      });

      if (!success || !notificationData) {
        throw new Error('Failed to create SMS record');
      }

      notification = notificationData;

      console.log(`[SMS] to ${to}: ${message}`);
      await this.storageService.updateStatus(notification._id!.toString(), 'sent');
      return true;
    } catch (error) {
      console.error(`SMS failed to ${to}:`, error);
      if (notification?._id) {
        await this.storageService.updateStatus(notification._id.toString(), 'failed');
      }
      throw error;
    }
  }
}
