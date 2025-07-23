import twilio from 'twilio';
import { logger } from '../utils/logger';
import { twilioConfig } from '../config/sms';
import { RateLimiterMemory } from 'rate-limiter-flexible';

interface SmsMessage {
  to: string;
  body: string;
}


const rateLimiter = new RateLimiterMemory({
  points: twilioConfig.rateLimit.max,
  duration: twilioConfig.rateLimit.windowMs / 1000
});
export class SmsService {

private client = twilio(process.env.TWILIO_ACCOUNT_SID!, process.env.TWILIO_AUTH_TOKEN!);

async sendSms(to: string, body: string): Promise<void> {
    try {
      await rateLimiter.consume(to);

      const message = body.length > twilioConfig.maxLength 
      ? `${body.substring(0, twilioConfig.maxLength - 3)}...` 
      : body;

      const result = await this.client.messages.create({
        body: message,
        from: process.env.TWILIO_PHONE_NUMBER!,
        to,
        statusCallback: `${twilioConfig.webhookUrl}/status`

      });

      logger.info(`SMS sent to ${to} (SID: ${result.sid})`);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('rate limit')) {
          logger.warn(`Rate limit exceeded for ${to}`);
        } else {
          logger.error(`SMS send failed to ${to}:`, error);
        }
      }
    }
  }

async isNumberOptedOut(phone: string): Promise<boolean> {
    try {
      const result = await this.client.messages.create({
        body: 'Validation message',
        from: process.env.TWILIO_PHONE_NUMBER,
        to: phone,
        statusCallback: `${process.env.API_BASE_URL}/sms/carrier-opt-out`
      }).catch(err => {
        if (err.code === 21610) { // Twilio error code for opted-out numbers
          return { status: 'failed', code: 21610 } as const; // Mark as const for type inference
        }
        throw err;
      });
  
      // Type guard to check if it's an error response
      return 'code' in result && result.code === 21610;
    } catch (error) {
      logger.error(`Error checking carrier opt-out for ${phone}:`, error);
      return false;
    }
  }
}

export const smsService = new SmsService();
