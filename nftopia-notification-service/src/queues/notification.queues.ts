import { emailService } from '../services/emailService';
import { RedisService } from '../services/redisService';

interface RetryPayload {
  email: string;
  originalEvent: any;
  attempt: number;
  lastAttemptAt: number;
  nextAttemptAt: number;
}

export class NotificationQueue {
  private readonly MAX_RETRY_ATTEMPTS = 3;
  private readonly RETRY_DELAYS = [
    5 * 60 * 1000,   // 5 minutes
    30 * 60 * 1000,   // 30 minutes
    60 * 60 * 1000    // 1 hour
  ];
  private readonly QUEUE_PREFIX = 'email_retries';
  private readonly SUPPRESSION_KEY = 'suppressed_emails';

  constructor(
    private readonly redisService: RedisService,
    private readonly emailService: typeof emailService
  ) {}

  /**
   * Initializes the queue by processing any pending retries
   */
  public async initialize(): Promise<void> {
    await this.processPendingRetries();
  }

  /**
   * Schedules an email retry with exponential backoff
   */
  public async scheduleRetry(
    email: string,
    originalEvent: any,
    attempt: number = 1
  ): Promise<void> {
    if (attempt > this.MAX_RETRY_ATTEMPTS) {
      await this.addToSuppressionList(email, 'max_retries');
      console.warn(`Max retries reached for ${email}`);
      return;
    }

    const delay = this.RETRY_DELAYS[Math.min(attempt - 1, this.RETRY_DELAYS.length - 1)];
    const now = Date.now();
    const payload: RetryPayload = {
      email,
      originalEvent,
      attempt,
      lastAttemptAt: now,
      nextAttemptAt: now + delay
    };

    try {
      const key = this.getJobKey(email, attempt);
      await this.redisService.client.set(
        key,
        JSON.stringify(payload),
        { PX: delay + (60 * 1000) } // TTL = delay + 1min buffer
      );

      setTimeout(() => this.processRetry(email, attempt), delay);
      console.log(`Scheduled retry #${attempt} for ${email} in ${delay}ms`);
    } catch (error) {
      console.error(`Failed to schedule retry for ${email}:`, error);
      throw error;
    }
  }

  /**
   * Processes all pending retries from Redis
   */
  private async processPendingRetries(): Promise<void> {
    try {
      const keys = await this.redisService.client.keys(`${this.QUEUE_PREFIX}:*`);
      
      await Promise.all(keys.map(async (key) => {
        const payloadStr = await this.redisService.client.get(key);
        if (!payloadStr) return;

        const payload = JSON.parse(payloadStr) as RetryPayload;
        const now = Date.now();
        
        if (now >= payload.nextAttemptAt) {
          await this.processRetry(payload.email, payload.attempt);
        } else {
          const remainingDelay = payload.nextAttemptAt - now;
          setTimeout(() => this.processRetry(payload.email, payload.attempt), remainingDelay);
        }
      }));
    } catch (error) {
      console.error('Error processing pending retries:', error);
    }
  }

  /**
   * Processes a retry attempt
   */
  private async processRetry(email: string, attempt: number): Promise<void> {
    const key = this.getJobKey(email, attempt);
    
    try {
      // Verify job still exists and get payload
      const payloadStr = await this.redisService.client.get(key);
      if (!payloadStr) {
        console.log(`Retry job expired or already processed for ${email}`);
        return;
      }

      const payload = JSON.parse(payloadStr) as RetryPayload;
      
      // Check suppression status
      if (await this.isSuppressed(email)) {
        console.log(`Skipping retry for suppressed email: ${email}`);
        await this.redisService.client.del(key);
        return;
      }

      // Reconstruct and send email
      const message = this.reconstructMessage(payload.originalEvent);
      await this.emailService.sendTemplatedEmail({
        to: email,
        templateType: 'nftPurchase',
        dynamicData: payload.originalEvent,
        subject: message.subject
      });

      // Clean up
      await this.redisService.client.del(key);
      console.log(`Successfully processed retry #${attempt} for ${email}`);
    } catch (error) {
      console.error(`Retry #${attempt} failed for ${email}:`, error);
      
      // Schedule next attempt if remaining
      if (attempt < this.MAX_RETRY_ATTEMPTS) {
        await this.scheduleRetry(email, payload.originalEvent, attempt + 1);
      } else {
        await this.addToSuppressionList(email, 'max_retries');
      }
      
      // Clean up failed job
      await this.redisService.client.del(key);
    }
  }

  /**
   * Adds an email to the suppression list
   */
  private async addToSuppressionList(email: string, reason: string): Promise<void> {
    await this.redisService.client.sAdd(this.SUPPRESSION_KEY, email);
    console.log(`Added ${email} to suppression list. Reason: ${reason}`);
  }

  /**
   * Checks if an email is suppressed
   */
  private async isSuppressed(email: string): Promise<boolean> {
    return await this.redisService.client.sIsMember(this.SUPPRESSION_KEY, email);
  }

  /**
   * Generates Redis key for a retry job
   */
  private getJobKey(email: string, attempt: number): string {
    return `${this.QUEUE_PREFIX}:${email}:${attempt}`;
  }

  /**
   * Reconstructs email message from original event
   */
  private reconstructMessage(event: any): { subject: string; body: string } {
    return {
      subject: event.subject || 'Your NFT Transaction Notification',
      body: event.body || `Your NFT transaction details:\n\n` +
        `Transaction ID: ${event.txHash || 'N/A'}\n` +
        `Status: ${event.status || 'completed'}\n\n` +
        `Thank you for using our service.`
    };
  }
}
