import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request, Response } from 'express';

interface RateLimitEntry {
  count: number;
  resetTime: number;
  firstRequest: number;
}

interface RateLimitConfig {
  limit: number;
  windowMs: number;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  keyGenerator?: (request: Request) => string;
}

// Decorator for custom rate limit configuration
export const RateLimit = (config: Partial<RateLimitConfig>) => {
  return (target: any, propertyKey?: string, descriptor?: PropertyDescriptor) => {
    const reflector = new Reflector();
    if (descriptor) {
      // Method decorator
      reflector.set('rateLimit', config, descriptor.value);
    } else {
      // Class decorator
      reflector.set('rateLimit', config, target);
    }
  };
};

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly logger = new Logger(RateLimitGuard.name);
  private readonly requests = new Map<string, RateLimitEntry>();
  private readonly cleanupInterval: NodeJS.Timeout;

  // Default configuration
  private readonly defaultConfig: RateLimitConfig = {
    limit: 100, // 100 requests per minute
    windowMs: 60 * 1000, // 1 minute
    skipSuccessfulRequests: false,
    skipFailedRequests: false,
  };

  constructor(private reflector: Reflector) {
    // Cleanup expired entries every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredEntries();
    }, 5 * 60 * 1000);
  }

  onModuleDestroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    // Get rate limit configuration from decorator or use default
    const config = this.getRateLimitConfig(context);

    const clientKey = config.keyGenerator
      ? config.keyGenerator(request)
      : this.getClientKey(request);

    const now = Date.now();
    const entry = this.requests.get(clientKey);

    if (!entry || now > entry.resetTime) {
      // First request or window expired
      const newEntry: RateLimitEntry = {
        count: 1,
        resetTime: now + config.windowMs,
        firstRequest: now,
      };
      this.requests.set(clientKey, newEntry);
      this.setRateLimitHeaders(response, config, newEntry, now);
      return true;
    }

    if (entry.count >= config.limit) {
      this.logger.warn(`Rate limit exceeded for key: ${clientKey}`);
      this.setRateLimitHeaders(response, config, entry, now);

      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: `Rate limit exceeded. Maximum ${config.limit} requests per ${config.windowMs / 1000} seconds.`,
          retryAfter: Math.ceil((entry.resetTime - now) / 1000),
          limit: config.limit,
          remaining: 0,
          resetTime: new Date(entry.resetTime).toISOString(),
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Increment counter
    entry.count++;
    this.setRateLimitHeaders(response, config, entry, now);
    return true;
  }

  private getRateLimitConfig(context: ExecutionContext): RateLimitConfig {
    // Try to get config from method decorator first
    const methodConfig = this.reflector.get<Partial<RateLimitConfig>>(
      'rateLimit',
      context.getHandler(),
    );

    // Then try class decorator
    const classConfig = this.reflector.get<Partial<RateLimitConfig>>(
      'rateLimit',
      context.getClass(),
    );

    // Merge configurations with default
    return {
      ...this.defaultConfig,
      ...classConfig,
      ...methodConfig,
    };
  }

  private getClientKey(request: Request): string {
    // Try multiple headers to get the real client IP
    const forwarded = request.headers['x-forwarded-for'] as string;
    const realIp = request.headers['x-real-ip'] as string;
    const cfConnectingIp = request.headers['cf-connecting-ip'] as string;

    let clientIp = 'unknown';

    if (forwarded) {
      // X-Forwarded-For can contain multiple IPs, take the first one
      clientIp = forwarded.split(',')[0].trim();
    } else if (realIp) {
      clientIp = realIp;
    } else if (cfConnectingIp) {
      clientIp = cfConnectingIp;
    } else if (request.connection?.remoteAddress) {
      clientIp = request.connection.remoteAddress;
    } else if (request.socket?.remoteAddress) {
      clientIp = request.socket.remoteAddress;
    }

    // Remove IPv6 prefix if present
    if (clientIp.startsWith('::ffff:')) {
      clientIp = clientIp.substring(7);
    }

    return clientIp;
  }

  private setRateLimitHeaders(
    response: Response,
    config: RateLimitConfig,
    entry: RateLimitEntry,
    now: number,
  ): void {
    const remaining = Math.max(0, config.limit - entry.count);
    const resetTime = Math.ceil((entry.resetTime - now) / 1000);

    response.setHeader('X-RateLimit-Limit', config.limit.toString());
    response.setHeader('X-RateLimit-Remaining', remaining.toString());
    response.setHeader('X-RateLimit-Reset', entry.resetTime.toString());
    response.setHeader('X-RateLimit-Reset-After', resetTime.toString());

    if (remaining === 0) {
      response.setHeader('Retry-After', resetTime.toString());
    }
  }

  private cleanupExpiredEntries(): void {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, entry] of this.requests.entries()) {
      if (now > entry.resetTime) {
        this.requests.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      this.logger.debug(`Cleaned up ${cleanedCount} expired rate limit entries`);
    }
  }

  // Public method to get current rate limit status for monitoring
  public getRateLimitStatus(): {
    totalEntries: number;
    activeEntries: number;
    memoryUsage: string;
  } {
    const now = Date.now();
    let activeEntries = 0;

    for (const [, entry] of this.requests.entries()) {
      if (now <= entry.resetTime) {
        activeEntries++;
      }
    }

    const memoryUsage = `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`;

    return {
      totalEntries: this.requests.size,
      activeEntries,
      memoryUsage,
    };
  }

  // Method to manually reset rate limit for a specific key (useful for testing)
  public resetRateLimit(key: string): boolean {
    return this.requests.delete(key);
  }

  // Method to check if a key is currently rate limited
  public isRateLimited(key: string, config?: Partial<RateLimitConfig>): boolean {
    const mergedConfig = { ...this.defaultConfig, ...config };
    const entry = this.requests.get(key);

    if (!entry) return false;

    const now = Date.now();
    if (now > entry.resetTime) {
      this.requests.delete(key);
      return false;
    }

    return entry.count >= mergedConfig.limit;
  }
}
