import { Request, Response, NextFunction } from 'express';
import { database } from '../config/database';
import mongoose from 'mongoose';

/**
 * Middleware for database health checks and error handling
 */
export class DatabaseMiddleware {
  // Checks database connection before proceeding
  static connectionHealthCheck(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    if (!database.getConnection()) {
      return res.status(503).json({
        success: false,
        error: 'Database connection not established',
        code: 'DB_CONNECTION_FAILED'
      });
    }
    next();
  }

  // Handles database errors in a consistent way
  static errorHandler(
    err: Error | mongoose.Error | any,
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    // Handle Mongoose validation errors
    if (err instanceof mongoose.Error.ValidationError) {
      return res.status(400).json({
        success: false,
        error: 'Database validation failed',
        details: err.errors,
        code: 'DB_VALIDATION_FAILED'
      });
    }

    // Handle Mongoose duplicate key errors
    if (err.code === 11000) {
      return res.status(409).json({
        success: false,
        error: 'Duplicate key violation',
        code: 'DB_DUPLICATE_KEY'
      });
    }

    // Handle Mongoose cast errors
    if (err instanceof mongoose.Error.CastError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid data format',
        code: 'DB_CAST_ERROR'
      });
    }

    // Handle other Mongoose errors
    if (err instanceof mongoose.Error) {
      console.error('Mongoose Error:', err);
      return res.status(500).json({
        success: false,
        error: 'Database operation failed',
        code: 'DB_OPERATION_FAILED'
      });
    }

    // Handle generic database errors
    if (err instanceof Error && err.message.includes('Database')) {
      console.error('Database Error:', err);
      return res.status(500).json({
        success: false,
        error: 'Database service unavailable',
        code: 'DB_SERVICE_UNAVAILABLE'
      });
    }

    // Not a database error, pass to next error handler
    next(err);
  }

  // Middleware to verify database writes were successful
  static verifyWriteOperation(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    const originalSend = res.send;
    res.send = function (body?: any): Response {
      // Check for database write operations in the response
      if (body?.modifiedCount === 0 || body?.upsertedCount === 0) {
        console.warn('Database write operation had no effect', {
          url: req.originalUrl,
          method: req.method,
          body: req.body
        });
      }
      return originalSend.call(this, body);
    };
    next();
  }
}

// Convenience exports for common middleware use cases
export const dbHealthCheck = DatabaseMiddleware.connectionHealthCheck;
export const dbErrorHandler = DatabaseMiddleware.errorHandler;
export const dbWriteVerifier = DatabaseMiddleware.verifyWriteOperation;
