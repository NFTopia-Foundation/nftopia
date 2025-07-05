/**
 * SendGrid Webhook Event Types
 * Documentation: https://docs.sendgrid.com/for-developers/tracking-events/event
 */

/**
 * Base SendGrid event properties common to all event types
 */
interface SendGridBaseEvent {
  email: string;
  timestamp: number;
  event: string;
  sg_event_id: string;
  sg_message_id: string;
  ip?: string;
  useragent?: string;
}

/**
 * Bounce-specific event properties
 */
interface SendGridBounceEvent extends SendGridBaseEvent {
  event: 'bounce';
  type: 'hard' | 'soft';
  reason: string;
  status?: string;
}

/**
 * Spam report event properties
 */
interface SendGridSpamReportEvent extends SendGridBaseEvent {
  event: 'spamreport';
}

/**
 * Blocked email event properties
 */
interface SendGridBlockedEvent extends SendGridBaseEvent {
  event: 'blocked';
  reason: string;
}

/**
 * Email delivered event properties
 */
interface SendGridDeliveredEvent extends SendGridBaseEvent {
  event: 'delivered';
  response?: string;
}

/**
 * Email opened event properties
 */
interface SendGridOpenEvent extends SendGridBaseEvent {
  event: 'open';
}

/**
 * Email clicked event properties
 */
interface SendGridClickEvent extends SendGridBaseEvent {
  event: 'click';
  url: string;
}

/**
 * Union type of all possible SendGrid event types
 */
type SendGridEvent = 
  | SendGridBounceEvent
  | SendGridSpamReportEvent
  | SendGridBlockedEvent
  | SendGridDeliveredEvent
  | SendGridOpenEvent
  | SendGridClickEvent;

/**
 * String literal union type of possible SendGrid event types
 */
type SendGridEventType = 
  | 'bounce'
  | 'spamreport'
  | 'blocked'
  | 'delivered'
  | 'open'
  | 'click';

/**
 * Webhook payload structure from SendGrid
 */
interface SendGridWebhookPayload extends Array<SendGridEvent> {}

/**
 * Webhook signature verification headers
 */
interface SendGridWebhookHeaders {
  'x-twilio-email-event-webhook-signature': string;
  'x-twilio-email-event-webhook-timestamp': string;
}

export {
  SendGridBaseEvent,
  SendGridBounceEvent,
  SendGridSpamReportEvent,
  SendGridBlockedEvent,
  SendGridDeliveredEvent,
  SendGridOpenEvent,
  SendGridClickEvent,
  SendGridEvent,
  SendGridEventType,
  SendGridWebhookPayload,
  SendGridWebhookHeaders
};
