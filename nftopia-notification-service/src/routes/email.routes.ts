import { Router } from 'express';
import { body, query } from 'express-validator';
import { emailController } from '../controllers/email.controller';
import { validateRequest } from '../middlewares/validateRequest'; 
import { rateLimiter } from '../middlewares/rateLimiter'; 

const router = Router();

// Validation middleware for different email types
const nftPurchaseValidation = [
  body('buyerEmail').isEmail().withMessage('Valid buyer email is required'),
  body('buyerName').notEmpty().withMessage('Buyer name is required'),
  body('nftName').notEmpty().withMessage('NFT name is required'),
  body('nftImage').optional().isURL().withMessage('NFT image must be a valid URL'),
  body('purchasePrice').notEmpty().withMessage('Purchase price is required'),
  body('transactionHash').notEmpty().withMessage('Transaction hash is required'),
  body('sellerName').optional().isString()
];

const bidAlertValidation = [
  body('userEmail').isEmail().withMessage('Valid user email is required'),
  body('userName').notEmpty().withMessage('User name is required'),
  body('nftName').notEmpty().withMessage('NFT name is required'),
  body('nftImage').optional().isURL().withMessage('NFT image must be a valid URL'),
  body('bidAmount').notEmpty().withMessage('Bid amount is required'),
  body('currentHighestBid').optional().isString(),
  body('auctionEndDate').isISO8601().withMessage('Valid auction end date is required'),
  body('bidderName').notEmpty().withMessage('Bidder name is required')
];

const announcementValidation = [
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
  body('userEmail').isEmail().withMessage('Valid user email is required'),
  body('userName').notEmpty().withMessage('User name is required'),
  body('resetToken').notEmpty().withMessage('Reset token is required'),
  body('resetUrl').isURL().withMessage('Valid reset URL is required'),
  body('expiryTime').optional().isISO8601().withMessage('Valid expiry time required')
];

const statsValidation = [
  query('startDate').optional().isISO8601().withMessage('Valid start date required'),
  query('endDate').optional().isISO8601().withMessage('Valid end date required')
];

// Webhook endpoint (no authentication/rate limiting for SendGrid webhooks)
router.post('/webhook', emailController.handleWebhook.bind(emailController));

// Email sending endpoints (with rate limiting and validation)
router.post(
  '/send/purchase-confirmation',
  rateLimiter(50, 15 * 60 * 1000), // 50 requests per 15 minutes
  nftPurchaseValidation,
  validateRequest,
  emailController.sendPurchaseConfirmation.bind(emailController)
);

router.post(
  '/send/bid-alert',
  rateLimiter(100, 15 * 60 * 1000), // 100 requests per 15 minutes
  bidAlertValidation,
  validateRequest,
  emailController.sendBidAlert.bind(emailController)
);

router.post(
  '/send/announcement',
  rateLimiter(10, 60 * 60 * 1000), // 10 bulk announcements per hour
  announcementValidation,
  validateRequest,
  emailController.sendAnnouncement.bind(emailController)
);

router.post(
  '/send/password-reset',
  rateLimiter(20, 15 * 60 * 1000), // 20 password resets per 15 minutes
  passwordResetValidation,
  validateRequest,
  emailController.sendPasswordReset.bind(emailController)
);

// Health and monitoring endpoints
router.get(
  '/health',
  rateLimiter(100, 60 * 1000), // 100 health checks per minute
  emailController.getHealthStatus.bind(emailController)
);

router.get(
  '/stats',
  rateLimiter(30, 60 * 1000), // 30 stats requests per minute
  statsValidation,
  validateRequest,
  emailController.getEmailStats.bind(emailController)
);

export default router;