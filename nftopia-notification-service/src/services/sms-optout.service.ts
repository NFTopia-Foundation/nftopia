import { SmsSuppression } from '../models/sms-suppression.model';
import { smsService } from './sms.service';
import { logger } from '../utils/logger';
import { database } from '../config/database';

export class SmsOptOutService {
  async processOptOut(phone: string): Promise<void> {
    await this.createSuppression(phone, 'USER_INITIATED');
    await this.sendConfirmationSms(phone);
  }

  async processCarrierOptOut(phone: string): Promise<void> {
    await this.createSuppression(phone, 'CARRIER');
    logger.info(`Carrier-level opt-out processed for ${phone}`);
  }

  private async createSuppression(
    phone: string, 
    type: 'USER_INITIATED' | 'CARRIER'
  ): Promise<void> {
    try {
      await database.connect();
      
      await SmsSuppression.findOneAndUpdate(
        { phone },
        {
          phone,
          type,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
        },
        { upsert: true, new: true }
      );
    } catch (error) {
      logger.error(`Failed to create suppression for ${phone}:`, error);
      throw error;
    }
  }

  async isOptedOut(phone: string): Promise<boolean> {
    try {
      const suppression = await SmsSuppression.findOne({ 
        phone,
        expiresAt: { $gt: new Date() } 
      }).lean();
      
      return !!suppression;
    } catch (error) {
      logger.error(`Error checking opt-out for ${phone}:`, error);
      return false;
    }
  }

  private async sendConfirmationSms(phone: string): Promise<void> {
    try {
      await smsService.sendSms(
        phone,
        'You have successfully opted out of non-critical SMS notifications. ' +
        'Critical transaction alerts will still be delivered as required.'
      );
    } catch (error) {
      logger.error(`Failed to send confirmation to ${phone}:`, error);
      // Don't throw - failing to send confirmation shouldn't fail the opt-out
    }
  }

  async isSuppressed(phone: string): Promise<boolean> {
    try {
      const record = await SmsSuppression.findOne({ 
        phone,
        expiresAt: { $gt: new Date() } 
      }).lean();  // .lean() returns plain JS objects for better performance
      
      return !!record;
    } catch (error) {
      logger.error(`Error checking suppression for ${phone}:`, error);
      return false;  // Fail "open" (assume not suppressed if error occurs)
    }
  }
}

export const smsOptOutService = new SmsOptOutService();





// // src/services/sms-optout.service.ts
// import { SmsSuppression } from '../models/sms-suppression.model';
// import { logger } from '../utils/logger';
// import { database } from '../config/database';
// import { smsService } from './sms.service';

// export class SmsOptOutService {
//   async processOptOut(phone: string): Promise<void> {
//     try {
//       await database.connect(); // Ensure connection
      
//       await SmsSuppression.findOneAndUpdate(
//         { phone },
//         {
//           phone,
//           type: 'USER_INITIATED',
//           expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
//         },
//         { upsert: true, new: true }
//       );

//       await this.sendConfirmationSms(phone);
//       logger.info(`Processed opt-out for ${phone}`);
//     } catch (error) {
//       logger.error(`Failed to process opt-out for ${phone}:`, error);
//       throw error;
//     }
//   }

//   async isOptedOut(phone: string): Promise<boolean> {
//     try {
//       const suppression = await SmsSuppression.findOne({ 
//         phone,
//         expiresAt: { $gt: new Date() } 
//       }).lean();
      
//       return !!suppression;
//     } catch (error) {
//       logger.error(`Error checking opt-out for ${phone}:`, error);
//       return false;
//     }
//   }

// private async sendConfirmationSms(phone: string): Promise<void> {
//     try {
//       await smsService.sendSms(
//         phone,
//         'You have successfully opted out of non-critical SMS notifications from NFTopia. ' +
//         'Critical transaction alerts will still be delivered as required by financial regulations.'
//       );
//     } catch (error) {
//       logger.error(`Failed to send opt-out confirmation to ${phone}:`, error);
//       // Don't throw - failing to send confirmation shouldn't fail the whole opt-out
//     }
//   }
// }

// export const smsOptOutService = new SmsOptOutService();





// import { SmsSuppressionRepository } from '../repositories/sms-suppression.repository';
// import { smsService } from './sms.service';
//   import { auditService } from './audit.service';

// export class SmsOptOutService {
//   private suppressionRepo = new SmsSuppressionRepository();


//   async processOptOut(phone: string) {
//     await this.suppressionRepo.createSuppression(phone, 'USER_INITIATED');
//     await this.sendConfirmationSms(phone);
    
//     await auditService.log({
//       action: 'SMS_OPT_OUT',
//       userId: null,
//       entityType: 'SMS',
//       entityId: phone,
//       metadata: { type: 'USER_INITIATED' }
//     });
//   }

//   async processCarrierOptOut(phone: string) {
//     await this.suppressionRepo.createSuppression(phone, 'CARRIER');
//   }

//   async isOptedOut(phone: string): Promise<boolean> {
//     return this.suppressionRepo.isSuppressed(phone);
//   }

//   private async sendConfirmationSms(phone: string) {
//     await smsService.sendSms({
//       to: phone,
//       body: 'You have successfully opted out of non-critical SMS notifications from NFTopia. Critical transaction alerts will still be delivered as required by financial regulations.'
//     });
//   }
// }

// export const smsOptOutService = new SmsOptOutService();