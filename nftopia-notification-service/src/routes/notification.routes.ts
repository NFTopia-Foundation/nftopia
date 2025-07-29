import { sendPurchaseEmail } from '../controllers/notification.controller';
import { unsubscribeEmail, getPreferenceCenter, updatePreferences, sendGridWebhook } from '../controllers/unsubscribe.controller';
import { Router } from 'express';
import { NotificationController } from '../controllers/notification.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

const controller = new NotificationController();


router.post('/notifications/purchase', sendPurchaseEmail);

router.post('/notifications', authMiddleware, controller.createNotification);
router.get('/notifications/:id', authMiddleware, controller.getNotification);
// Add other routes for update, delete, etc.

// Unsubscribe endpoints
router.get('/unsubscribe/:token', unsubscribeEmail);
router.get('/preferences/:token', getPreferenceCenter);
router.post('/preferences/:token', updatePreferences);

// Webhook for SendGrid
router.post('/webhook/sendgrid', sendGridWebhook);

export default router;








