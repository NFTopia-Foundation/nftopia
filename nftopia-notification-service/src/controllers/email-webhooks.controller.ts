// src/controllers/email-webhooks.controller.ts
import { Request, Response } from 'express';
import { BounceService } from '../services/email-bounce.service';
import { SuppressionService } from '../services/suppressionService';

interface SendGridEvent {
  email: string;
  timestamp: number;
  event: 'bounce' | 'spamreport' | 'blocked' | 'delivered';
  reason?: string;
  type?: 'hard' | 'soft';
}

export class EmailWebhooksController {
  private bounceService: BounceService;
  private suppressionService: SuppressionService;

  constructor(
    bounceService?: BounceService,
    suppressionService?: SuppressionService
  ) {
    this.bounceService = bounceService || new BounceService();
    this.suppressionService = suppressionService || new SuppressionService();
    this.handleEvent = this.handleEvent.bind(this);
  }

  /**
   * Validates incoming SendGrid webhook requests
   * @param req - Express request object
   * @returns boolean indicating validity
   */
  private validateWebhook(req: Request): boolean {
    if (!process.env.SENDGRID_WEBHOOK_SECRET) {
      console.error('SENDGRID_WEBHOOK_SECRET is not configured');
      return false;
    }

    const token = req.headers['x-sendgrid-webhook-token'];
    return token === process.env.SENDGRID_WEBHOOK_SECRET;
  }

  /**
   * Handles incoming SendGrid webhook events
   * @param req - Express request object
   * @param res - Express response object
   */
  public async handleEvent(req: Request, res: Response): Promise<Response> {
    // Validate webhook authenticity
    if (!this.validateWebhook(req)) {
      return res.status(401).json({ error: 'Unauthorized webhook request' });
    }

    // Validate payload structure
    if (!Array.isArray(req.body)) {
      return res.status(400).json({ error: 'Invalid payload format' });
    }

    try {
      // Process events in parallel
      await Promise.all(
        req.body.map(async (event: SendGridEvent) => {
          switch (event.event) {
            case 'bounce':
              // Ensure bounce events have a type field
              if (!event.type) {
                console.warn(`Bounce event missing type field for email: ${event.email}`);
                // Default to 'hard' for safety in production
                event.type = 'hard';
              }
              await this.bounceService.process(event);
              break;

            case 'spamreport':
              await this.suppressionService.addWithReason(
                event.email,
                'spam_report'
              );
              break;

            case 'blocked':
              await this.bounceService.handleBlocked(
                event.email,
                event.reason
              );
              break;

            case 'delivered':
              // Successfully delivered, no action needed
              break;

            default:
              console.warn(`Unhandled event type: ${event.event}`);
          }
        })
      );

      return res.status(200).send('Webhook processed successfully');

    } catch (error) {
      console.error('Webhook processing failed:', error);
      return res.status(500).json({
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    }
  }
}
