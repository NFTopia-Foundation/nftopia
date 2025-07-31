// src/middlewares/auth.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export const authMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    const authHeader = req.headers['authorization'];
    const apiKey = process.env.INTERNAL_API_KEY;

    // Validate environment configuration
    if (!apiKey) {
      logger.error('Internal API key not configured');
      res.status(500).json({ error: 'Server configuration error' });
      return;
    }

    // Validate authorization header
    if (!authHeader) {
      logger.warn('Missing authorization header', {
        ip: req.ip,
        path: req.path
      });
      res.status(401).json({ error: 'Authorization header required' });
      return;
    }

    // Verify API key
    if (authHeader !== `Bearer ${apiKey}`) {
      logger.warn('Invalid API key attempt', {
        ip: req.ip,
        path: req.path
      });
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    // Authentication successful
    next();
  } catch (error) {
    logger.error('Authentication middleware error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

