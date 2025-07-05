// src/middlewares/twilio.middleware.ts
import { Request, Response, NextFunction } from 'express';
import twilio from 'twilio';
import { logger } from '../utils/logger';

// Type definitions for our helper functions
interface SignatureResult {
  valid: boolean;
  statusCode?: number;
  errorMessage?: string;
  signature?: string;
}

interface ValidationResult {
  valid: boolean;
  statusCode?: number;
  errorMessage?: string;
}

export function validateTwilioWebhook(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  
  // Validate configuration
  if (!authToken) {
    logger.error('Twilio auth token not configured');
    res.status(500).send('Server configuration error');
    return;
  }

  // Process signature header with type safety
  const signatureResult = processTwilioSignature(req);
  if (!signatureResult.valid) {
    if (signatureResult.statusCode && signatureResult.errorMessage) {
      res.status(signatureResult.statusCode).send(signatureResult.errorMessage);
    } else {
      res.status(500).send('Unexpected signature validation error');
    }
    return;
  }

  // Validate request with type safety
  if (!signatureResult.signature) {
    res.status(500).send('Missing signature after validation');
    return;
  }

  const validationResult = validateTwilioRequest(
    authToken,
    signatureResult.signature,
    req
  );
  
  if (!validationResult.valid) {
    if (validationResult.statusCode && validationResult.errorMessage) {
      res.status(validationResult.statusCode).send(validationResult.errorMessage);
    } else {
      res.status(500).send('Unexpected validation error');
    }
    return;
  }

  next();
}

// Helper function with explicit return type
function processTwilioSignature(req: Request): SignatureResult {
  const twilioSignatureHeader = req.headers['x-twilio-signature'];

  if (Array.isArray(twilioSignatureHeader)) {
    logger.warn('Multiple Twilio signatures received, using first one', {
      signatures: twilioSignatureHeader
    });
    return {
      valid: true,
      signature: twilioSignatureHeader[0]
    };
  }

  if (typeof twilioSignatureHeader === 'string') {
    return {
      valid: true,
      signature: twilioSignatureHeader
    };
  }

  logger.warn('Missing Twilio signature header', { url: req.originalUrl });
  return {
    valid: false,
    statusCode: 403,
    errorMessage: 'Missing signature header'
  };
}

// Helper function with explicit return type
function validateTwilioRequest(
  authToken: string,
  signature: string,
  req: Request
): ValidationResult {
  try {
    const url = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
    const isValid = twilio.validateRequest(
      authToken,
      signature,
      url,
      req.body
    );

    if (!isValid) {
      logger.warn('Invalid Twilio signature', {
        ip: req.ip,
        url,
        signature
      });
      return {
        valid: false,
        statusCode: 403,
        errorMessage: 'Invalid signature'
      };
    }

    return { valid: true };
  } catch (error) {
    logger.error('Twilio validation error:', error);
    return {
      valid: false,
      statusCode: 500,
      errorMessage: 'Validation error'
    };
  }
}

