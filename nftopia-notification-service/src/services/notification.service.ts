import { FCMService } from "@/channels/fcm/fcm.service";
import { NotificationStorageService } from "./NotificationStorageService";

export class NotificationService {
  private static storageService = new NotificationStorageService();
  private static fcmService = new FCMService();

  private static async sendNotification(
    type: "email" | "sms" | "push",
    recipient: string,
    message: string,
    userId: string
  ): Promise<boolean> {
    const creationResult = await this.storageService.createAndSendNotification({
      userId,
      type,
      content: message,
      recipient,
      status: "pending",
    });

    if (!creationResult.success || !creationResult.data) {
      throw new Error(`Failed to create ${type} notification record`);
    }

    const notification = creationResult.data;

    try {
      await this.dispatchNotification(type, recipient, message, userId);
      await this.storageService.updateStatus(
        notification._id.toString(),
        "sent"
      );
      return true;
    } catch (error) {
      console.error(`${type.toUpperCase()} failed:`, error);
      await this.storageService.updateStatus(
        notification._id.toString(),
        "failed"
      );
      throw error;
    }
  }

  private static async dispatchNotification(
    type: "email" | "sms" | "push",
    recipient: string,
    message: string,
    userId: string
  ): Promise<void> {
    switch (type) {
      case "email":
        console.log(`[Email] to ${recipient}: ${message}`);
        break;
      case "sms":
        console.log(`[SMS] to ${recipient}: ${message}`);
        break;
      case "push":
        await this.fcmService.sendToUser(userId, {
          notification: {
            title: "Notification",
            body: message,
          },
          data: {
            userId,
            type: "push",
          },
        });
        break;
      default:
        throw new Error(`Unsupported notification type: ${type}`);
    }
  }

  static async sendPush(userId: string, message: string): Promise<boolean> {
    return this.sendNotification("push", "", message, userId);
  }

  /**
   * Sends email notification
   * @param to Recipient email
   * @param message Email content
   * @param userId User ID for reference
   */
  static async sendEmail(
    to: string,
    message: string,
    userId: string
  ): Promise<boolean> {
    return this.sendNotification("email", to, message, userId);
  }

  /**
   * Sends SMS notification
   * @param to Recipient phone number
   * @param message SMS content
   * @param userId User ID for reference
   */
  static async sendSMS(
    to: string,
    message: string,
    userId: string
  ): Promise<boolean> {
    return this.sendNotification("sms", to, message, userId);
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
