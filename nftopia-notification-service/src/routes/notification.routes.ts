// import { sendPurchaseEmail } from '../controllers/notification.controller';
// import { unsubscribeEmail, getPreferenceCenter, updatePreferences, sendGridWebhook } from '../controllers/unsubscribe.controller';
// import { Router } from 'express';
// import { NotificationController } from '../controllers/notification.controller';
// import { authMiddleware } from '../middlewares/auth.middleware';

// const router = Router();

// const controller = new NotificationController();


// router.post('/notifications/purchase', sendPurchaseEmail);

// router.post('/notifications', authMiddleware, controller.createNotification);
// router.get('/notifications/:id', authMiddleware, controller.getNotification);
// // Add other routes for update, delete, etc.

// // Unsubscribe endpoints
// router.get('/unsubscribe/:token', unsubscribeEmail);
// router.get('/preferences/:token', getPreferenceCenter);
// router.post('/preferences/:token', updatePreferences);

// // Webhook for SendGrid
// router.post('/webhook/sendgrid', sendGridWebhook);

// export default router;


import { Router } from 'express';
import { NotificationController } from '../controllers/notification.controller';
import { validateBody } from '../middlewares/validate.middleware';
import { createNotificationSchema, updateStatusSchema } from '../validators/notification.schema';


const router = Router();


// Create
router.post('/', validateBody(createNotificationSchema), NotificationController.create);


// Read
router.get('/:id', NotificationController.getById);
router.get('/user/:userId', NotificationController.listByUser);
router.get('/nft/:nftId', NotificationController.listByNFT);


// Update
router.patch('/:id/read', NotificationController.markAsRead);
router.patch('/:id/status', validateBody(updateStatusSchema), NotificationController.updateStatus);


// Delete
router.delete('/:id', NotificationController.softDelete);
router.delete('/:id/hard', NotificationController.hardDelete);


export default router;








