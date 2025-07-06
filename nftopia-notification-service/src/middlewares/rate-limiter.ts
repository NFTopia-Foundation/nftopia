import { Request, Response, NextFunction } from 'express';
import { RateLimiterMemory } from 'rate-limiter-flexible';
import { twilioConfig } from '../config/sms';

const limiter = new RateLimiterMemory({
  points: twilioConfig.rateLimit.max,
  duration: twilioConfig.rateLimit.windowMs / 1000
});

export const rateLimiter = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const phone = req.body.phone;
    await limiter.consume(phone);
    next();
  } catch (error) {
    res.status(429).json({ error: 'Too many requests' });
  }
};