import { sendPurchaseEmail } from '../controllers/notification.controller';
import { Router } from 'express';

const router = Router();

router.post('/notifications/purchase', sendPurchaseEmail);

export default router;