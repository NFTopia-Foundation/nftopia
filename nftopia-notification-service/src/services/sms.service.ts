import twilio from 'twilio';
import { logger } from '../utils/logger';

interface SmsMessage {
  to: string;
  body: string;
}

export class SmsService {
  private client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

//   async sendSms(message: SmsMessage) {
//     try {
//       const result = await this.client.messages.create({
//         body: message.body,
//         from: process.env.TWILIO_PHONE_NUMBER,
//         to: message.to
//       });
      
//       logger.info(`SMS sent to ${message.to}, SID: ${result.sid}`);
//       return result;
//     } catch (error) {
//       logger.error(`Failed to send SMS to ${message.to}:`, error);
//       throw error;
//     }
//   }

async sendSms(to: string, body: string): Promise<void> {
    try {
      const result = await this.client.messages.create({
        body,
        from: process.env.TWILIO_PHONE_NUMBER,
        to,
      });

      logger.info(`SMS sent to ${to} (SID: ${result.sid})`);
    } catch (error) {
      logger.error(`Failed to send SMS to ${to}:`, error);
      throw error;
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