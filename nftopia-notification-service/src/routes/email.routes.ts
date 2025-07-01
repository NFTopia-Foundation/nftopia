import { Router, Request, Response, NextFunction } from 'express';
import { body, query } from 'express-validator';
import { emailController } from '../controllers/email.controller';
import { validateRequest } from '../middlewares/validateRequest'; 
import { rateLimiter } from '../middlewares/rateLimiter';
import { NotificationPayload } from '../types/notification.types';

// Extend Express Request interface to include notificationPayload
declare global {
  namespace Express {
    interface Request {
      notificationPayload?: NotificationPayload;
    }
  }
}

const router = Router();

// Validation middleware extensions
const baseEmailValidation = [
  body('userId').notEmpty().withMessage('User ID is required'),
  body('content').notEmpty().withMessage('Content is required'),
  body('metadata').optional().isObject()
];

const nftPurchaseValidation = [
  ...baseEmailValidation,
  body('recipient').isEmail().withMessage('Valid buyer email is required'),
  body('buyerName').notEmpty().withMessage('Buyer name is required'),
  body('nftName').notEmpty().withMessage('NFT name is required'),
  body('nftImage').optional().isURL().withMessage('NFT image must be a valid URL'),
  body('purchasePrice').notEmpty().withMessage('Purchase price is required'),
  body('transactionHash').notEmpty().withMessage('Transaction hash is required'),
  body('sellerName').optional().isString()
];

const bidAlertValidation = [
  ...baseEmailValidation,
  body('recipient').isEmail().withMessage('Valid user email is required'),
  body('userName').notEmpty().withMessage('User name is required'),
  body('nftName').notEmpty().withMessage('NFT name is required'),
  body('nftImage').optional().isURL().withMessage('NFT image must be a valid URL'),
  body('bidAmount').notEmpty().withMessage('Bid amount is required'),
  body('currentHighestBid').optional().isString(),
  body('auctionEndDate').isISO8601().withMessage('Valid auction end date is required'),
  body('bidderName').notEmpty().withMessage('Bidder name is required')
];

const announcementValidation = [
  ...baseEmailValidation,
  body('recipients').isArray({ min: 1 }).withMessage('Recipients array is required'),
  body('recipients.*.email').isEmail().withMessage('Valid email required for each recipient'),
  body('recipients.*.name').optional().isString(),
  body('subject').notEmpty().withMessage('Subject is required'),
  body('announcementTitle').notEmpty().withMessage('Announcement title is required'),
  body('announcementContent').notEmpty().withMessage('Announcement content is required'),
  body('actionUrl').optional().isURL().withMessage('Action URL must be valid'),
  body('actionText').optional().isString()
];

const passwordResetValidation = [
  ...baseEmailValidation,
  body('recipient').isEmail().withMessage('Valid user email is required'),
  body('userName').notEmpty().withMessage('User name is required'),
  body('resetToken').notEmpty().withMessage('Reset token is required'),
  body('resetUrl').isURL().withMessage('Valid reset URL is required'),
  body('expiryTime').optional().isISO8601().withMessage('Valid expiry time required')
];

const statsValidation = [
  query('startDate').optional().isISO8601().withMessage('Valid start date required'),
  query('endDate').optional().isISO8601().withMessage('Valid end date required')
];

// Webhook endpoint remains unchanged
router.post('/webhook', emailController.handleWebhook.bind(emailController));

// Updated email sending endpoints with notification fields
router.post(
  '/send/purchase-confirmation',
  rateLimiter(50, 15 * 60 * 1000),
  nftPurchaseValidation,
  validateRequest,
  (req: Request, res: Response, next: NextFunction) => {
    req.notificationPayload = {
      userId: req.body.userId,
      type: 'email',
      content: req.body.content,
      recipient: req.body.recipient,
      metadata: {
        ...req.body.metadata,
        emailType: 'purchase-confirmation',
        nftName: req.body.nftName,
        transactionHash: req.body.transactionHash
      }
    };
    next();
  },
  emailController.sendPurchaseConfirmation.bind(emailController)
);

router.post(
  '/send/bid-alert',
  rateLimiter(100, 15 * 60 * 1000),
  bidAlertValidation,
  validateRequest,
  (req: Request, res: Response, next: NextFunction) => {
    req.notificationPayload = {
      userId: req.body.userId,
      type: 'email',
      content: req.body.content,
      recipient: req.body.recipient,
      metadata: {
        ...req.body.metadata,
        emailType: 'bid-alert',
        nftName: req.body.nftName,
        bidAmount: req.body.bidAmount
      }
    };
    next();
  },
  emailController.sendBidAlert.bind(emailController)
);

export default router;