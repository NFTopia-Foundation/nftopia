import { FilterQuery, UpdateQuery } from 'mongoose';
import { 
  CreateNotificationPayload,
  CreateNotificationResult,
  DeleteNotificationResult,
  INotificationDocument,
  NotificationQueryParams,
  PaginationOptions,
  QueryNotificationResult,
  UpdateNotificationPayload,
  UpdateNotificationResult
} from '../types/notification.types';
import { Notification } from '../models/Notification';

// Handles all database operations for notifications

export class NotificationRepository {
  /**
   * Creates a new notification record
   * @param payload Notification data without auto-generated fields
   * @returns Either the created notification or an error
   */
  async create(
    payload: CreateNotificationPayload
  ): Promise<CreateNotificationResult> {
    try {
      const notification = await Notification.create({
        ...payload,
        status: payload.status || 'pending' // Default status
      });
      return { success: true, data: notification };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Notification creation failed'
      };
    }
  }

  /**
   * Finds notification by ID
   * @param id MongoDB ObjectId
   * @returns Notification document or not-found error
   */
  async findById(id: string): Promise<QueryNotificationResult> {
    try {
      const notification = await Notification.findById(id);
      return notification 
        ? { success: true, data: notification } 
        : { success: false, error: 'Notification not found' };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Database query failed'
      };
    }
  }

  /**
   * Finds notifications by user ID with pagination
   * @param userId User identifier
   * @param options Pagination settings (page/perPage)
   */
  async findByUserId(
    userId: string,
    options?: PaginationOptions
  ): Promise<QueryNotificationResult<INotificationDocument[]>> {
    try {
      const query = Notification.find({ userId });
      
      if (options) {
        query.skip((options.page - 1) * options.perPage)
             .limit(options.perPage);
      }

      const data = await query.exec();
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Database query failed'
      };
    }
  }

  /**
   * Updates notification status
   * @param id Notification ID
   * @param status New status (sent/failed)
   */
  async updateStatus(
    id: string,
    status: 'sent' | 'failed'
  ): Promise<UpdateNotificationResult> {
    try {
      const result = await Notification.updateOne(
        { _id: id },
        { $set: { status, updatedAt: new Date() } }
      );
      return { success: true, data: result };
    } catch (error) {
      return this.handleUpdateError(error);
    }
  }

  /**
   * Finds notifications within date range
   * @param start Start date (inclusive)
   * @param end End date (inclusive)
   * @param params Additional query filters
   */
  async findByDateRange(
    start: Date,
    end: Date,
    params?: Omit<NotificationQueryParams, 'startDate' | 'endDate'>
  ): Promise<QueryNotificationResult<INotificationDocument[]>> {
    try {
      const query = this.buildQuery({ ...params, startDate: start, endDate: end });
      const data = await Notification.find(query);
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Database query failed'
      };
    }
  }

  /**
   * Updates status for multiple notifications
   * @param ids Array of notification IDs
   * @param status New status for all
   */
  async bulkUpdateStatus(
    ids: string[],
    status: 'sent' | 'failed'
  ): Promise<UpdateNotificationResult> {
    try {
      const result = await Notification.updateMany(
        { _id: { $in: ids } },
        { $set: { status, updatedAt: new Date() } }
      );
      return { success: true, data: result };
    } catch (error) {
      return this.handleUpdateError(error);
    }
  }

  // Builds MongoDB query from filter params

  private buildQuery(params: NotificationQueryParams): FilterQuery<INotificationDocument> {
    const query: FilterQuery<INotificationDocument> = {};

    if (params.userId) query.userId = params.userId;
    if (params.type) query.type = params.type;
    if (params.status) query.status = params.status;
    
    // Date range filtering
    if (params.startDate || params.endDate) {
      query.createdAt = {
        ...(params.startDate && { $gte: params.startDate }),
        ...(params.endDate && { $lte: params.endDate })
      };
    }

    return query;
  }

  // Standardizes update error responses

  private handleUpdateError(error: unknown): UpdateNotificationResult {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Database update failed'
    };
  }
}
