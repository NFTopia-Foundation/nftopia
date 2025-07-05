import { Request, Response, NextFunction } from 'express';
import { Router } from 'express';
import { SmsOptOutController } from '../controllers/sms-optout.controller';
import { validateTwilioWebhook } from '../middlewares/twilio.middleware'; 
import {
  sendSMS,
  sendBidAlert,
  sendMarketing,
  send2FA,
  sendNFTPurchase,
  getRateLimitInfo,
  getAbuseAttempts,
  healthCheck,
} from '../controllers/sms.controller';
import {
  bidAlertRateLimit,
  marketingRateLimit,
  twoFARateLimit,
  nftPurchaseRateLimit,
} from '../middlewares/smsRateLimit';
import { authMiddleware } from '../middlewares/auth.middleware';

// Extend Express Request interface to include notificationPayload
declare global {
  namespace Express {
    interface Request {
      notificationPayload?: {
        userId: string;
        type: 'email' | 'sms' | 'push' | 'in-app';
        content: string;
        recipient: string;
        metadata?: Record<string, any>;
      };
    }
  }
}

const router = Router();



const optOutController = new SmsOptOutController();

// Twilio webhook route with validation middleware
router.post(
  '/sms/opt-out',
  validateTwilioWebhook, // Security middleware
  optOutController.handleUserOptOut
);

// Internal API for carrier opt-outs
router.post('/sms/carrier-opt-out',  authMiddleware, optOutController.handleCarrierOptOut);


// Health check endpoint
router.get('/health', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await healthCheck(req, res);
  } catch (error) {
    next(error);
  }
});

// Send SMS endpoints with rate limiting middleware
router.post('/send', (req: Request, res: Response, next: NextFunction): void => {
  req.notificationPayload = {
    userId: req.body.userId,
    type: 'sms',
    content: req.body.content,
    recipient: req.body.recipient,
    metadata: {
      ...req.body.metadata,
      smsType: 'standard'
    }
  };
  next();
}, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await sendSMS(req, res);
  } catch (error) {
    next(error);
  }
});

router.post('/bid-alert', bidAlertRateLimit, (req: Request, res: Response, next: NextFunction): void => {
  req.notificationPayload = {
    userId: req.body.userId,
    type: 'sms',
    content: req.body.content,
    recipient: req.body.recipient,
    metadata: {
      ...req.body.metadata,
      smsType: 'bid-alert'
    }
  };
  next();
}, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await sendBidAlert(req, res);
    return;
  } catch (error) {
    next(error);
  }
});

router.post('/marketing', marketingRateLimit, (req: Request, res: Response, next: NextFunction): void => {
  req.notificationPayload = {
    userId: req.body.userId,
    type: 'sms',
    content: req.body.content,
    recipient: req.body.recipient,
    metadata: {
      ...req.body.metadata,
      smsType: 'marketing'
    }
  };
  next();
}, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await sendMarketing(req, res);
    return;
  } catch (error) {
    next(error);
  }
});

router.post('/2fa', twoFARateLimit, (req: Request, res: Response, next: NextFunction): void => {
  req.notificationPayload = {
    userId: req.body.userId,
    type: 'sms',
    content: req.body.content,
    recipient: req.body.recipient,
    metadata: {
      ...req.body.metadata,
      smsType: '2fa'
    }
  };
  next();
}, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await send2FA(req, res);
    return;
  } catch (error) {
    next(error);
  }
});

router.post('/nft-purchase', nftPurchaseRateLimit, (req: Request, res: Response, next: NextFunction): void => {
  req.notificationPayload = {
    userId: req.body.userId,
    type: 'sms',
    content: req.body.content,
    recipient: req.body.recipient,
    metadata: {
      ...req.body.metadata,
      smsType: 'nft-purchase'
    }
  };
  next();
}, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await sendNFTPurchase(req, res);
    return;
  } catch (error) {
    next(error);
  }
});

// Rate limiting and abuse detection endpoints
router.get('/rate-limit/:userId/:notificationType', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await getRateLimitInfo(req, res);
  } catch (error) {
    next(error);
  }
});

router.get('/abuse/:userId/:notificationType', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await getAbuseAttempts(req, res);
  } catch (error) {
    next(error);
  }
});


export default router;
