import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';

@Injectable()
export class CsrfGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const csrfToken = request.headers['x-csrf-token'];
    const cookieCsrfToken = request.cookies?.['csrf-token'];
    
    // Skip CSRF check for GET requests
    if (request.method === 'GET') {
      return true;
    }
    
    if (!csrfToken || !cookieCsrfToken || csrfToken !== cookieCsrfToken) {
      throw new UnauthorizedException('CSRF token validation failed');
    }
    
    return true;
  }
}