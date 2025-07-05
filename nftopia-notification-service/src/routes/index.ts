import { Router } from 'express';
import { healthCheck } from '../controllers/health.controller';
import { EmailWebhooksController } from '../controllers/email-webhooks.controller';

const router = Router();
const emailWebhooksController = new EmailWebhooksController();

router.get('/health', healthCheck);
router.post('/webhooks/email', emailWebhooksController.handleEvent);

export default router;