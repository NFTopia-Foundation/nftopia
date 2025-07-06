import { Request, Response } from 'express';
import smsService from '../services/smsService';
import { SendSMSRequest, NotificationType } from '../types/sms';
import { logger } from '../utils/logger';


/**
 * Send SMS notification
 */
export const sendSMS = async (req: Request, res: Response) => {
  try {
    const { to, userId, notificationType, message, dynamicData } = req.body;

    // Validate required fields
    if (!to || !userId || !notificationType) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: to, userId, notificationType',
      });
    }

    // Validate notification type
    const validTypes: NotificationType[] = ['bidAlert', 'marketing', '2fa', 'nftPurchase'];
    if (!validTypes.includes(notificationType)) {
      return res.status(400).json({
        success: false,
        error: `Invalid notification type. Must be one of: ${validTypes.join(', ')}`,
      });
    }

    const request: SendSMSRequest = {
      to,
      userId,
      notificationType,
      message,
      dynamicData,
    };

    const result = await smsService.sendSMS(request);

    if (!result.success) {
      if (result.rateLimited) {
        return res.status(429).json({
          success: false,
          error: result.error,
          rateLimited: true,
          remainingQuota: result.remainingQuota,
          retryAfter: '1 hour', // For bid alerts, 24 hours for marketing
        });
      }
      
      return res.status(400).json({
        success: false,
        error: result.error,
      });
    }

    return res.status(200).json({
      success: true,
      messageId: result.messageId,
      remainingQuota: result.remainingQuota,
    });

  } catch (error: any) {
    console.error('SMS Controller Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};

/**
 * Send bid alert SMS
 */
export const sendBidAlert = async (req: Request, res: Response) => {
  try {
    const { userId, to, bidAmount, nftName, currentHighestBid, auctionEndDate } = req.body;

    if (!userId || !to || !bidAmount || !nftName) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: userId, to, bidAmount, nftName',
      });
    }

    const result = await smsService.sendBidAlert(userId, to, {
      bidAmount,
      nftName,
      currentHighestBid: currentHighestBid || 'N/A',
      auctionEndDate: auctionEndDate || 'N/A',
    });

    if (!result.success) {
      if (result.rateLimited) {
        return res.status(429).json({
          success: false,
          error: result.error,
          rateLimited: true,
          remainingQuota: result.remainingQuota,
          retryAfter: '1 hour',
        });
      }
      
      return res.status(400).json({
        success: false,
        error: result.error,
      });
    }

    return res.status(200).json({
      success: true,
      messageId: result.messageId,
      remainingQuota: result.remainingQuota,
    });

  } catch (error: any) {
    console.error('Bid Alert SMS Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};

/**
 * Send marketing SMS
 */
export const sendMarketing = async (req: Request, res: Response) => {
  try {
    const { userId, to, announcementTitle, announcementContent } = req.body;

    if (!userId || !to || !announcementTitle || !announcementContent) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: userId, to, announcementTitle, announcementContent',
      });
    }

    const result = await smsService.sendMarketing(userId, to, {
      announcementTitle,
      announcementContent,
    });

    if (!result.success) {
      if (result.rateLimited) {
        return res.status(429).json({
          success: false,
          error: result.error,
          rateLimited: true,
          remainingQuota: result.remainingQuota,
          retryAfter: '24 hours',
        });
      }
      
      return res.status(400).json({
        success: false,
        error: result.error,
      });
    }

    return res.status(200).json({
      success: true,
      messageId: result.messageId,
      remainingQuota: result.remainingQuota,
    });

  } catch (error: any) {
    console.error('Marketing SMS Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};

/**
 * Send 2FA SMS
 */
export const send2FA = async (req: Request, res: Response) => {
  try {
    const { userId, to, code } = req.body;

    if (!userId || !to || !code) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: userId, to, code',
      });
    }

    const result = await smsService.send2FA(userId, to, { code });

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error,
      });
    }

    return res.status(200).json({
      success: true,
      messageId: result.messageId,
    });

  } catch (error: any) {
    console.error('2FA SMS Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};

/**
 * Send NFT purchase confirmation SMS
 */
export const sendNFTPurchase = async (req: Request, res: Response) => {
  try {
    const { userId, to, nftName, purchasePrice, transactionHash } = req.body;

    if (!userId || !to || !nftName || !purchasePrice || !transactionHash) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: userId, to, nftName, purchasePrice, transactionHash',
      });
    }

    const result = await smsService.sendNFTPurchase(userId, to, {
      nftName,
      purchasePrice,
      transactionHash,
    });

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error,
      });
    }

    return res.status(200).json({
      success: true,
      messageId: result.messageId,
    });

  } catch (error: any) {
    console.error('NFT Purchase SMS Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};

/**
 * Get rate limit info for a user
 */
export const getRateLimitInfo = async (req: Request, res: Response) => {
  try {
    const { userId, notificationType } = req.params;

    if (!userId || !notificationType) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: userId, notificationType',
      });
    }

    const validTypes: NotificationType[] = ['bidAlert', 'marketing', '2fa', 'nftPurchase'];
    if (!validTypes.includes(notificationType as NotificationType)) {
      return res.status(400).json({
        success: false,
        error: `Invalid notification type. Must be one of: ${validTypes.join(', ')}`,
      });
    }

    const rateLimitInfo = await smsService.getRateLimitInfo(userId, notificationType as NotificationType);

    return res.status(200).json({
      success: true,
      data: rateLimitInfo,
    });

  } catch (error: any) {
    console.error('Rate Limit Info Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};

/**
 * Get abuse attempts for a user
 */
export const getAbuseAttempts = async (req: Request, res: Response) => {
  try {
    const { userId, notificationType } = req.params;

    if (!userId || !notificationType) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: userId, notificationType',
      });
    }

    const validTypes: NotificationType[] = ['bidAlert', 'marketing', '2fa', 'nftPurchase'];
    if (!validTypes.includes(notificationType as NotificationType)) {
      return res.status(400).json({
        success: false,
        error: `Invalid notification type. Must be one of: ${validTypes.join(', ')}`,
      });
    }

    const abuseAttempts = await smsService.getAbuseAttempts(userId, notificationType as NotificationType);

    return res.status(200).json({
      success: true,
      data: abuseAttempts,
    });

  } catch (error: any) {
    console.error('Abuse Attempts Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};

/**
 * Health check endpoint
 */
export const healthCheck = async (req: Request, res: Response) => {
  try {
    const health = await smsService.healthCheck();
    
    if (health.status === 'healthy') {
      return res.status(200).json({
        success: true,
        status: 'healthy',
        service: 'SMS',
      });
    } else {
      return res.status(503).json({
        success: false,
        status: 'unhealthy',
        service: 'SMS',
        details: health.details,
      });
    }
  } catch (error: any) {
    console.error('Health Check Error:', error);
    return res.status(503).json({
      success: false,
      status: 'unhealthy',
      service: 'SMS',
      details: error.message,
    });
  }
}; 


export const handleWebhook = async (req: Request, res: Response) => {
  const { MessageStatus, To } = req.body;
  logger.info(`SMS delivery update for ${To}: ${MessageStatus}`);
  res.status(200).end();
}
