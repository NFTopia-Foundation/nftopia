import { sendPurchaseEmail } from '../controllers/notification.controller';
import { unsubscribeEmail, getPreferenceCenter, updatePreferences, sendGridWebhook } from '../controllers/unsubscribe.controller';
import { Router } from 'express';

const router = Router();

router.post('/notifications/purchase', sendPurchaseEmail);

// Unsubscribe endpoints
router.get('/unsubscribe/:token', unsubscribeEmail);
router.get('/preferences/:token', getPreferenceCenter);
router.post('/preferences/:token', updatePreferences);

// Webhook for SendGrid
router.post('/webhook/sendgrid', sendGridWebhook);

export default router;