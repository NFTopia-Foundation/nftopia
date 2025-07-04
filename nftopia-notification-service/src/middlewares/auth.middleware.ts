// src/middlewares/auth.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const apiKey = process.env.INTERNAL_API_KEY; // Set this in your .env

  if (!authHeader || authHeader !== `Bearer ${apiKey}`) {
    logger.warn('Unauthorized API access attempt', {
      ip: req.ip,
      path: req.path
    });
    return res.status(401).json({ error: 'Unauthorized' });
  }

  next();
};