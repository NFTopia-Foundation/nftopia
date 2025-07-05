import { SuppressionService } from './suppressionService';
import { NotificationQueue } from '../queues/notification.queue';

interface BounceEvent {
  email: string;
  timestamp: number;
  type: 'hard' | 'soft';
  reason?: string;
}

const MAX_RETRY_ATTEMPTS = 3;
const RETRY_WINDOW_MS = 24 * 60 * 60 * 1000;

export class BounceService {
  private suppressionService: SuppressionService;
  private notificationQueue: NotificationQueue;
  private retryRegistry: Map<string, { attempts: number; firstAttempt: number }>;

  constructor() {
    this.suppressionService = new SuppressionService();
    this.notificationQueue = new NotificationQueue();
    this.retryRegistry = new Map();
  }

  public async process(event: BounceEvent): Promise<void> {
    try {
      switch (event.type) {
        case 'hard':
          await this.handleHardBounce(event);
          break;
        case 'soft':
          await this.handleSoftBounce(event);
          break;
        default:
          console.warn(`Unknown bounce type: ${event.type}`, event);
      }
    } catch (error) {
      console.error(`Failed to process bounce event for ${event.email}`, error);
      throw error;
    }
  }

  private async handleHardBounce(event: BounceEvent): Promise<void> {
    await this.suppressionService.addWithReason(
      event.email,
      `hard_bounce: ${event.reason || 'unknown'}`
    );
    await this.notifyUserOfPermanentFailure(event.email);
    this.clearRetryState(event.email);
  }

  private async handleSoftBounce(event: BounceEvent): Promise<void> {
    const retryState = this.getRetryState(event.email);

    if (retryState.attempts >= MAX_RETRY_ATTEMPTS) {
      await this.suppressionService.addWithReason(
        event.email,
        `max_soft_bounces: ${event.reason || 'unknown'}`
      );
      await this.notifyUserOfPermanentFailure(event.email);
      this.clearRetryState(event.email);
      return;
    }

    if (Date.now() - retryState.firstAttempt > RETRY_WINDOW_MS) {
      this.clearRetryState(event.email);
      return this.handleSoftBounce(event);
    }

    const nextAttempt = this.calculateRetryDelay(retryState.attempts);
    this.retryRegistry.set(event.email, {
      attempts: retryState.attempts + 1,
      firstAttempt: retryState.firstAttempt,
    });

    await this.notificationQueue.scheduleRetry(event.email, nextAttempt);
  }

  private getRetryState(email: string): {
    attempts: number;
    firstAttempt: number;
  } {
    const currentState = this.retryRegistry.get(email);
    return currentState || { attempts: 0, firstAttempt: Date.now() };
  }

  private clearRetryState(email: string): void {
    this.retryRegistry.delete(email);
  }

  private calculateRetryDelay(attempt: number): number {
    const baseDelay = 5 * 60 * 1000;
    return Math.min(baseDelay * Math.pow(2, attempt), RETRY_WINDOW_MS);
  }

  private async notifyUserOfPermanentFailure(email: string): Promise<void> {
    try {
      console.log(`Notifying user of permanent failure: ${email}`);
    } catch (error) {
      console.error(`Failed to notify user ${email} of permanent failure`, error);
    }
  }

  public async handleSpamReport(email: string): Promise<void> {
    await this.suppressionService.addWithReason(email, 'spam_report');
    console.warn(`Processed spam report for ${email}`);
  }

  public async handleBlocked(email: string, reason?: string): Promise<void> {
    console.warn(`Email blocked: ${email}`, { reason });
  }
}
