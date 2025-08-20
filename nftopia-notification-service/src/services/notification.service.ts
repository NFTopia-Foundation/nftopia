import { 
    INotificationRepository, 
    NotificationRepository, 
    NotificationStatus, 
    NotificationType 
  } from '../repositories/notification.repository';
  import { INotification } from '../models/notification.model';
  import { AuditLog } from '../models/audit-log.model';
  import { EmailService } from './email.service';
  
  export class NotificationService {
    constructor(private repo: INotificationRepository = new NotificationRepository()) {}
  
    /**
     * Create a notification, persist it, log it, and trigger delivery if applicable.
     */
    async create(
      input: {
        userId: string;
        type: NotificationType;
        content: string;
        metadata?: INotification['metadata'];
        channels?: INotification['channels'];
        userEmail?: string; // needed for email channel
      },
      actorId: string | null
    ) {
      const createdNotification = await this.repo.create(input);
  
      // log creation
      await AuditLog.create({
        action: 'create',
        entityId: (createdNotification._id as unknown as string).toString(),
        // entityId: createdNotification.id, // 👈 critical for tracking
        before: null,
        after: createdNotification,
        actorId,
        entityType: 'Notification',
      });
  
      // dispatch channel delivery
      if (createdNotification.channels?.includes('email')) {
        await this.handleEmailNotification(createdNotification, input.userEmail);
      }
  
      // future: push, sms, in-app dispatchers can be plugged here
  
      return createdNotification;
    }
  
    /**
     * Handle email notifications per type.
     */
    private async handleEmailNotification(notification: INotification, fallbackEmail?: string) {
      if (!notification.metadata) return;
  
      const recipient = fallbackEmail || (notification as any).userEmail;
      if (!recipient) {
        console.warn(`[NotificationService] No recipient email for notification ${notification.id}`);
        return;
      }
  
      try {
        switch (notification.type) {
          case 'mint':
            await EmailService.sendTemplateEmail(recipient, 'mint', notification.metadata);
            break;
          case 'bid':
            await EmailService.sendTemplateEmail(recipient, 'bidAlert', notification.metadata);
            break;
          case 'sale':
            await EmailService.sendTemplateEmail(recipient, 'nftSale', notification.metadata);
            break;
          case 'auction':
            await EmailService.sendTemplateEmail(recipient, 'auctionUpdate', notification.metadata);
            break;
          case 'admin':
            await EmailService.sendTemplateEmail(recipient, 'adminMessage', notification.metadata);
            break;
        }
  
        // mark as sent
        await this.updateStatus(notification.id, 'sent', null);
      } catch (err) {
        // mark as failed if sending throws
        await this.updateStatus(notification.id, 'failed', null);
        throw err;
      }
    }
  
    async findById(id: string) {
      return this.repo.findById(id);
    }
  
    async findByUserId(userId: string, options?: { page?: number; limit?: number }) {
      return this.repo.findByUserId(userId, options);
    }
  
    async findByNFT(nftId: string) {
      return this.repo.findByNFT(nftId);
    }
  
    async markAsRead(id: string, actorId: string | null) {
      const before = await this.repo.findById(id);
      const updated = await this.repo.markAsRead(id);
      await AuditLog.create({
        action: 'markAsRead',
        entityId: id,
        before,
        after: updated,
        actorId,
        entityType: 'Notification',
      });
      return updated;
    }
  
    async updateStatus(id: string, status: Extract<NotificationStatus, 'sent' | 'failed'>, actorId: string | null) {
      const before = await this.repo.findById(id);
      const updated = await this.repo.updateStatus(id, status);
      await AuditLog.create({
        action: 'update',
        entityId: id,
        before,
        after: updated,
        actorId,
        entityType: 'Notification',
      });
      return updated;
    }
  
    async softDelete(id: string, actorId: string | null) {
      const before = await this.repo.findById(id);
      const updated = await this.repo.softDelete(id);
      await AuditLog.create({
        action: 'softDelete',
        entityId: id,
        before,
        after: updated,
        actorId,
        entityType: 'Notification',
      });
      return updated;
    }
  
    async hardDelete(id: string, actorId: string | null) {
      const before = await this.repo.findById(id);
      await this.repo.hardDelete(id);
      await AuditLog.create({
        action: 'hardDelete',
        entityId: id,
        before,
        after: null,
        actorId,
        entityType: 'Notification',
      });
    }
  }
