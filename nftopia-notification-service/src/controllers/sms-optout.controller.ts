import { Request, Response } from 'express';
import { smsOptOutService } from '../services/sms-optout.service';

export class SmsOptOutController {
  async handleUserOptOut(req: Request, res: Response) {
    const { From: phone } = req.body; // Twilio sends From parameter
    
    try {
      await smsOptOutService.processOptOut(phone);
      res.status(200).end();
    } catch (error) {
      res.status(500).json({ error: 'Failed to process opt-out' });
    }
  }

  async handleCarrierOptOut(req: Request, res: Response) {
    const { phone } = req.body;
    
    try {
      await smsOptOutService.processCarrierOptOut(phone);
      res.status(200).end();
    } catch (error) {
      res.status(500).json({ error: 'Failed to process carrier opt-out' });
    }
  }
}