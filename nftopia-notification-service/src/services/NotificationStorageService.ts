import { NotificationRepository } from '../repositories/NotificationRepository';
import {
  CreateNotificationPayload,
  NotificationQueryParams,
  PaginationOptions,
  INotification
} from '../types/notification.types';

export class NotificationStorageService {
  private readonly repository: NotificationRepository;

  constructor(repository = new NotificationRepository()) {
    this.repository = repository;
  }

  /**
   * Stores and sends a notification
   * @param payload Notification data
   * @returns The created notification document
   */
  async createAndSendNotification(
    payload: CreateNotificationPayload
  ) {
    try {
      // Store in database first
      const { success, data: notification } = await this.repository.create(payload);
     
      if (!success || !notification) {
        throw new Error('Failed to create notification record');
      }

      // Send via appropriate channel
      switch (notification.type) {
        case 'email':
          // Email sending logic would be handled by external service
          console.log(`[Email] Prepared: ${notification.recipient}`);
          break;
       
        case 'sms':
          // TODO: Implement SMS service integration
          console.log(`[SMS] Prepared: ${notification.recipient}`);
          break;
         
        case 'push':
          // TODO: Implement push notification service
          console.log(`[Push] Prepared: ${notification.recipient}`);
          break;
         
        default:
          throw new Error(`Unsupported notification type: ${notification.type}`);
      }

      return { success: true, data: notification };
    } catch (error) {
      console.error('Notification processing failed:', error);
      throw new Error(`Notification processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Updates notification status
   * @param id Notification ID
   * @param status New status
   */
  async updateStatus(id: string, status: 'sent' | 'failed') {
    try {
      return await this.repository.updateStatus(id, status);
    } catch (error) {
      console.error('Failed to update notification status:', error);
      throw new Error('Failed to update notification status');
    }
  }

  /**
   * Retrieves notifications with pagination
   * @param params Query filters
   * @param options Pagination settings
   * @returns Paginated notification results
   */
  async getNotifications(
    params: NotificationQueryParams,
    options?: PaginationOptions
  ) {
    try {
      return await this.repository.findByUserId(params.userId, options);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      throw new Error('Failed to retrieve notifications');
    }
  }

  /**
   * Gets notifications within date range
   * @param start Start date
   * @param end End date
   * @param params Additional filters
   * @returns Notifications in date range
   */
  async getNotificationsByDateRange(
    start: Date,
    end: Date,
    params?: Omit<NotificationQueryParams, 'startDate' | 'endDate'>
  ) {
    try {
      return await this.repository.findByDateRange(start, end, params);
    } catch (error) {
      console.error('Failed to fetch notifications by date range:', error);
      throw new Error('Failed to retrieve notifications by date range');
    }
  }

  /**
   * Updates multiple notifications to failed status
   * @param ids Array of notification IDs
   */
  async markNotificationsAsFailed(ids: string[]) {
    try {
      await this.repository.bulkUpdateStatus(ids, 'failed');
    } catch (error) {
      console.error('Failed to bulk update status:', error);
      throw new Error('Failed to update notification statuses');
    }
  }
}
