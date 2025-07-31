import { Request, Response, NextFunction } from 'express';
import { smsOptOutService } from '../services/sms-optout.service';

export async function checkSmsOptOut(req: Request, res: Response, next: NextFunction) {
  const { phone } = req.body;
  const isCritical = req.body.isCritical || false; // Flag for critical messages

  if (!isCritical && await smsOptOutService.isOptedOut(phone)) {
    return res.status(403).json({ error: 'User has opted out of non-critical messages' });
  }

  next();
}