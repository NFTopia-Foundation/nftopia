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








