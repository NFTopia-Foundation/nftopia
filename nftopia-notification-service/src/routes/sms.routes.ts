import express from 'express';
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

const router = express.Router();

// Health check endpoint
router.get('/health', healthCheck);

// Send SMS endpoints with rate limiting middleware
router.post('/send', sendSMS);
router.post('/bid-alert', bidAlertRateLimit, sendBidAlert);
router.post('/marketing', marketingRateLimit, sendMarketing);
router.post('/2fa', twoFARateLimit, send2FA);
router.post('/nft-purchase', nftPurchaseRateLimit, sendNFTPurchase);

// Rate limiting and abuse detection endpoints
router.get('/rate-limit/:userId/:notificationType', getRateLimitInfo);
router.get('/abuse/:userId/:notificationType', getAbuseAttempts);

export default router; 