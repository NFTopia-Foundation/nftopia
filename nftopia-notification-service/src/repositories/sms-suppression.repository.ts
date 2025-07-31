import { SmsSuppression } from '../models/sms-suppression.model';
import { logger } from '../utils/logger';

export class SmsSuppressionRepository {
  async createSuppression(phone: string, type: 'USER_INITIATED' | 'CARRIER') {
    return SmsSuppression.create({
      phone,
      type,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
    });
  }


  async isSuppressed(phone: string): Promise<boolean> {
    try {
      const record = await SmsSuppression.findOne({ 
        phone,
        expiresAt: { $gt: new Date() }  // Mongoose uses $gt instead of Op.gt
      }).exec();
      
      return !!record;
    } catch (error) {
      logger.error(`Error checking suppression for ${phone}:`, error);
      return false;
    }
  }

//   async isSuppressed(phone: string): Promise<boolean> {
//     const record = await SmsSuppression.findOne({
//       where: { phone, expiresAt: { [Op.gt]: new Date() } }
//     });
//     return !!record;
//   }
}