import { Request, Response } from 'express';
import { EmailService } from '../services/email.service';
import { PurchaseRequest, PurchaseData } from '../types/email';
import { NotificationRepository } from '../repositories/notification.repository';
import { logger } from '../utils/logger';

export const sendPurchaseEmail = async (
  req: Request<{}, {}, PurchaseRequest>,
  res: Response
) => {
  try {
    const { email, nftData, txData } = req.body;
    
    const purchaseData: PurchaseData = {
      nftName: nftData.name,
      nftImageUrl: nftData.image,
      txHash: txData.hash,
      price: txData.value,
      currency: txData.currency || 'ETH',
      txLink: `https://etherscan.io/tx/${txData.hash}`
    };

    await new EmailService().sendPurchaseConfirmation(email, purchaseData);
    res.json({ success: true });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: errorMessage });
  }
};





export class NotificationController {
  private repository = new NotificationRepository();

  async createNotification(req: Request, res: Response) {
    try {
      const notification = await this.repository.create(req.body);
      res.status(201).json(notification);
    } catch (error) {
      logger.error('Create notification error:', error);
      res.status(500).json({ error: 'Failed to create notification' });
    }
  }

  async getNotification(req: Request, res: Response) {
    try {
      const notification = await this.repository.findById(req.params.id);
      if (!notification) {
        return res.status(404).json({ error: 'Notification not found' });
      }
      res.json(notification);
    } catch (error) {
      logger.error('Get notification error:', error);
      res.status(500).json({ error: 'Failed to get notification' });
    }
  }

  // Implement other CRUD methods following the same pattern
  // getUserNotifications, getNFTNotifications, markAsRead, etc.
}