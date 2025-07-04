// src/middlewares/twilio.middleware.ts
import { Request, Response, NextFunction } from 'express';
import twilio from 'twilio';
import { logger } from '../utils/logger';

export function validateTwilioWebhook(req: Request, res: Response, next: NextFunction) {
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  
  if (!authToken) {
    logger.error('Twilio auth token not configured');
    return res.status(500).send('Server configuration error');
  }

  // Handle potential array of headers
  const twilioSignatureHeader = req.headers['x-twilio-signature'];
  let twilioSignature: string;

  if (Array.isArray(twilioSignatureHeader)) {
    // Take the first signature if multiple exist
    twilioSignature = twilioSignatureHeader[0];
    logger.warn('Multiple Twilio signatures received, using first one', {
      signatures: twilioSignatureHeader
    });
  } else if (typeof twilioSignatureHeader === 'string') {
    twilioSignature = twilioSignatureHeader;
  } else {
    logger.warn('Missing Twilio signature header', { url: req.originalUrl });
    return res.status(403).send('Missing signature header');
  }

  const url = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
  const params = req.body;

  try {
    const isValid = twilio.validateRequest(
      authToken,
      twilioSignature, // Now guaranteed to be string
      url,
      params
    );

    if (!isValid) {
      logger.warn('Invalid Twilio signature', {
        ip: req.ip,
        url,
        signature: twilioSignature
      });
      return res.status(403).send('Invalid signature');
    }

    return next();
  } catch (error) {
    logger.error('Twilio validation error:', error);
    return res.status(500).send('Validation error');
  }
}
