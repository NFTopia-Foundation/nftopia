import { NotificationStorageService } from './NotificationStorageService';
import { INotification } from '../types/notification.types';

export class NotificationService {
  private static storageService = new NotificationStorageService();

  /**
   * Unified notification handler for all notification types
   * @private
   */
  private static async sendNotification(
    type: 'email' | 'sms',
    recipient: string,
    message: string,
    userId: string
  ): Promise<boolean> {
    // Create notification record first
    const creationResult = await this.storageService.createAndSendNotification({
      userId,
      type,
      content: message,
      recipient,
      status: 'pending'
    });

    // Validate notification was created
    if (!creationResult.success || !creationResult.data) {
      throw new Error(`Failed to create ${type} notification record`);
    }

    const notification = creationResult.data;

    try {
      // Send the actual notification
      await this.dispatchNotification(type, recipient, message);

      // Update status to sent
      await this.storageService.updateStatus(notification._id.toString(), 'sent');
      return true;
    } catch (error) {
      console.error(`${type.toUpperCase()} failed to ${recipient}:`, error);
      
      // Update status to failed
      await this.storageService.updateStatus(notification._id.toString(), 'failed');
      throw error;
    }
  }

  /**
   * Handles the actual delivery mechanism for different notification types
   * @private
   */
  private static async dispatchNotification(
    type: 'email' | 'sms',
    recipient: string,
    message: string
  ): Promise<void> {
    switch (type) {
      case 'email':
        // Replace with actual email sending logic
        console.log(`[Email] to ${recipient}: ${message}`);
        break;
      case 'sms':
        // Replace with actual SMS sending logic
        console.log(`[SMS] to ${recipient}: ${message}`);
        break;
      default:
        throw new Error(`Unsupported notification type: ${type}`);
    }
  }

  /**
   * Sends email notification
   * @param to Recipient email
   * @param message Email content
   * @param userId User ID for reference
   */
  static async sendEmail(to: string, message: string, userId: string): Promise<boolean> {
    return this.sendNotification('email', to, message, userId);
  }

  /**
   * Sends SMS notification
   * @param to Recipient phone number
   * @param message SMS content
   * @param userId User ID for reference
   */
  static async sendSMS(to: string, message: string, userId: string): Promise<boolean> {
    return this.sendNotification('sms', to, message, userId);
  }
}





// import { NotificationStorageService } from './NotificationStorageService';
// import { INotification } from '../types/notification.types';

// export class NotificationService {
//   private static storageService = new NotificationStorageService();

//   /**
//    * Sends email and logs to database
//    * @param to Recipient email
//    * @param message Email content
//    * @param userId User ID for reference
//    */
//   static async sendEmail(to: string, message: string, userId: string) {
//     let notification: INotification | null = null;
    
//     try {
//       // Create notification record first
//       const { success, data: notificationData } = await this.storageService.createAndSendNotification({
//         userId,
//         type: 'email',
//         content: message,
//         recipient: to,
//         status: 'pending'
//       });

//       if (!success || !notificationData) {
//         throw new Error('Failed to create notification record');
//       }

//       notification = notificationData;

//       // Original send logic
//       console.log(`[Email] to ${to}: ${message}`);
      
//       // Update status to sent
//       await this.storageService.updateStatus(notification._id!.toString(), 'sent');
     
//       return true;
//     } catch (error) {
//       console.error(`Email failed to ${to}:`, error);
     
//       // Update status to failed if we have a notification ID
//       if (notification?._id) {
//         await this.storageService.updateStatus(notification._id.toString(), 'failed');
//       }
     
//       throw error;
//     }
//   }

//   /**
//    * Placeholder for SMS notification
//    */
//   static async sendSMS(to: string, message: string, userId: string) {
//     let notification: INotification | null = null;
    
//     try {
//       const { success, data: notificationData } = await this.storageService.createAndSendNotification({
//         userId,
//         type: 'sms',
//         content: message,
//         recipient: to,
//         status: 'pending'
//       });

//       if (!success || !notificationData) {
//         throw new Error('Failed to create SMS record');
//       }

//       notification = notificationData;

//       console.log(`[SMS] to ${to}: ${message}`);
//       await this.storageService.updateStatus(notification._id!.toString(), 'sent');
//       return true;
//     } catch (error) {
//       console.error(`SMS failed to ${to}:`, error);
//       if (notification?._id) {
//         await this.storageService.updateStatus(notification._id.toString(), 'failed');
//       }
//       throw error;
//     }
//   }
// }
