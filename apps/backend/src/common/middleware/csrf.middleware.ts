import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class CsrfMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // Skip CSRF check for GET requests and specific non-sensitive routes
    if (
      req.method === 'GET' || 
      req.path === '/api/auth/nonce' || 
      req.path === '/api/auth/wallet-login'
    ) {
      return next();
    }
    
    const csrfToken = req.headers['x-csrf-token'] as string;
    const cookieCsrfToken = req.cookies?.['csrf-token'];
    
    if (!csrfToken || !cookieCsrfToken || csrfToken !== cookieCsrfToken) {
      throw new UnauthorizedException('CSRF token validation failed');
    }
    
    next();
  }
}