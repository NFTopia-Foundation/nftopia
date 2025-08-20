import { Router } from 'express';
import { NotificationService } from '../services/notification.service';

const emailRouter = Router();
const notificationService = new NotificationService();

/**
 * SendGrid Event Webhook
 * This receives delivery, open, click, bounce events etc.
 * Docs: https://docs.sendgrid.com/for-developers/tracking-events/event
 */
emailRouter.post('/sendgrid/webhook', async (req, res) => {
  try {
    const events = req.body;
    console.log('[SendGrid Webhook] Incoming Events:', events);

    // Each event has `event` (status), `email`, `sg_message_id` etc.
    for (const evt of events) {
      const { event, sg_message_id } = evt;

      // TODO: If you map sg_message_id -> notificationId when sending emails,
      // you can reliably update the exact notification in DB.
      // For now, we’ll assume sg_message_id contains the notificationId.
      const notificationId = extractNotificationId(sg_message_id);

      if (!notificationId) continue;

      switch (event) {
        case 'delivered':
        case 'open':
        case 'click':
          await notificationService.updateStatus(notificationId, 'sent', null);
          break;

        case 'bounce':
        case 'dropped':
        case 'spamreport':
        case 'unsubscribe':
          await notificationService.updateStatus(notificationId, 'failed', null);
          break;

        default:
          console.log(`[Webhook] Ignored event type: ${event}`);
      }
    }

    res.status(200).send('OK');
  } catch (err) {
    console.error('[SendGrid Webhook] Error:', err);
    res.status(500).send('Error processing webhook');
  }
});

/**
 * Extract notificationId from SendGrid sg_message_id
 * - You should inject your own notificationId when sending emails
 *   (e.g., set `customArgs: { notificationId }` in EmailService)
 */
function extractNotificationId(sgMessageId: string | undefined): string | null {
  if (!sgMessageId) return null;

  // Example: if EmailService sets sg_message_id as "<notifId>.<randomSendgridId>"
  const parts = sgMessageId.split('.');
  return parts.length > 1 ? parts[0] : null;
}

export default emailRouter;
