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

interface BounceEvent {
  email: string;
  timestamp: number;
  event: 'bounce';
  type: 'hard' | 'soft';
  reason?: string;
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
   * Processes individual SendGrid webhook events
   * @param event - SendGrid event object
   * @returns Promise that resolves when event is processed
   */
  private async processEvent(event: SendGridEvent): Promise<void> {
    try {
      switch (event.event) {
        case 'bounce':
          // Create properly typed bounce event
          const bounceEvent: BounceEvent = {
            email: event.email,
            timestamp: event.timestamp,
            event: 'bounce',
            type: event.type || 'hard', // Default to 'hard' for safety
            reason: event.reason
          };
          
          if (!event.type) {
            console.warn(`Bounce event missing type field for email: ${event.email}, defaulting to 'hard'`);
          }
          
          await this.bounceService.process(bounceEvent);
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
    } catch (error) {
      console.error(`Error processing ${event.event} event for ${event.email}:`, error);
      // Don't rethrow - let other events continue processing
    }
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
      // Process events in parallel with error isolation
      const eventPromises = req.body.map((event: SendGridEvent) => 
        this.processEvent(event)
      );
      
      // Use Promise.allSettled to ensure all events are processed
      // even if some fail
      const results = await Promise.allSettled(eventPromises);
      
      // Log any failed events for monitoring
      const failedEvents = results.filter(result => result.status === 'rejected');
      if (failedEvents.length > 0) {
        console.error(`${failedEvents.length} events failed to process out of ${req.body.length} total events`);
      }

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
