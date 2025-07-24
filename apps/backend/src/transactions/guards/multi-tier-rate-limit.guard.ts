import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { WEBHOOK_RATE_LIMITS } from './webhook-rate-limit.config';

interface RateLimitEntry {
  count: number;
  resetTime: number;
  firstRequest: number;
}

interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
}

@Injectable()
export class MultiTierRateLimitGuard implements CanActivate {
  private readonly logger = new Logger(MultiTierRateLimitGuard.name);
  private readonly requests = new Map<string, RateLimitEntry>();
  private readonly cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Cleanup expired entries every 2 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredEntries();
    }, 2 * 60 * 1000);
  }

  onModuleDestroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    // Apply multiple rate limiting tiers
    const rateLimitChecks = [
      { name: 'burst', config: WEBHOOK_RATE_LIMITS.burst },
      { name: 'standard', config: WEBHOOK_RATE_LIMITS.standard },
      { name: 'transaction', config: WEBHOOK_RATE_LIMITS.transaction },
    ];

    let mostRestrictiveResult: RateLimitResult | null = null;
    const now = Date.now();

    // Check each rate limit tier
    for (const { name, config } of rateLimitChecks) {
      const key = `${name}:${config.keyGenerator(request)}`;
      const result = this.checkRateLimit(key, config, now);

      if (!result.allowed) {
        // Rate limit exceeded
        this.logger.warn(`Rate limit exceeded for ${name} tier: ${key}`);
        this.setRateLimitHeaders(response, result);
        
        throw new HttpException(
          {
            statusCode: HttpStatus.TOO_MANY_REQUESTS,
            message: `Rate limit exceeded for ${name} tier. Maximum ${result.limit} requests per window.`,
            retryAfter: result.retryAfter,
            limit: result.limit,
            remaining: result.remaining,
            resetTime: new Date(result.resetTime).toISOString(),
            tier: name,
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      // Track the most restrictive (lowest remaining) result for headers
      if (!mostRestrictiveResult || result.remaining < mostRestrictiveResult.remaining) {
        mostRestrictiveResult = result;
      }

      // Update the rate limit counter
      this.updateRateLimit(key, config, now);
    }

    // Set headers based on the most restrictive rate limit
    if (mostRestrictiveResult) {
      this.setRateLimitHeaders(response, mostRestrictiveResult);
    }

    return true;
  }

  private checkRateLimit(
    key: string,
    config: any,
    now: number
  ): RateLimitResult {
    const entry = this.requests.get(key);

    if (!entry || now > entry.resetTime) {
      // First request or window expired
      return {
        allowed: true,
        limit: config.limit,
        remaining: config.limit - 1,
        resetTime: now + config.windowMs,
      };
    }

    const remaining = Math.max(0, config.limit - entry.count);
    const allowed = entry.count < config.limit;

    return {
      allowed,
      limit: config.limit,
      remaining: allowed ? remaining - 1 : 0,
      resetTime: entry.resetTime,
      retryAfter: allowed ? undefined : Math.ceil((entry.resetTime - now) / 1000),
    };
  }

  private updateRateLimit(key: string, config: any, now: number): void {
    const entry = this.requests.get(key);

    if (!entry || now > entry.resetTime) {
      // First request or window expired
      this.requests.set(key, {
        count: 1,
        resetTime: now + config.windowMs,
        firstRequest: now,
      });
    } else {
      // Increment existing entry
      entry.count++;
    }
  }

  private setRateLimitHeaders(response: Response, result: RateLimitResult): void {
    response.setHeader('X-RateLimit-Limit', result.limit.toString());
    response.setHeader('X-RateLimit-Remaining', result.remaining.toString());
    response.setHeader('X-RateLimit-Reset', result.resetTime.toString());
    
    const resetAfter = Math.ceil((result.resetTime - Date.now()) / 1000);
    response.setHeader('X-RateLimit-Reset-After', resetAfter.toString());
    
    if (result.retryAfter) {
      response.setHeader('Retry-After', result.retryAfter.toString());
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

  // Monitoring methods
  public getRateLimitStatus(): {
    totalEntries: number;
    entriesByTier: Record<string, number>;
    memoryUsage: string;
  } {
    const entriesByTier: Record<string, number> = {};
    
    for (const [key] of this.requests.entries()) {
      const tier = key.split(':')[0];
      entriesByTier[tier] = (entriesByTier[tier] || 0) + 1;
    }
    
    const memoryUsage = `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`;
    
    return {
      totalEntries: this.requests.size,
      entriesByTier,
      memoryUsage,
    };
  }

  public resetRateLimit(key: string): boolean {
    return this.requests.delete(key);
  }

  public resetAllRateLimits(): void {
    this.requests.clear();
    this.logger.log('All rate limits reset');
  }

  // Check if any tier is rate limited for a given request
  public isRateLimited(request: Request): {
    isLimited: boolean;
    limitedTiers: string[];
    nextResetTime?: number;
  } {
    const now = Date.now();
    const limitedTiers: string[] = [];
    let nextResetTime: number | undefined;

    const rateLimitChecks = [
      { name: 'burst', config: WEBHOOK_RATE_LIMITS.burst },
      { name: 'standard', config: WEBHOOK_RATE_LIMITS.standard },
      { name: 'transaction', config: WEBHOOK_RATE_LIMITS.transaction },
    ];

    for (const { name, config } of rateLimitChecks) {
      const key = `${name}:${config.keyGenerator(request)}`;
      const result = this.checkRateLimit(key, config, now);

      if (!result.allowed) {
        limitedTiers.push(name);
        if (!nextResetTime || result.resetTime < nextResetTime) {
          nextResetTime = result.resetTime;
        }
      }
    }

    return {
      isLimited: limitedTiers.length > 0,
      limitedTiers,
      nextResetTime,
    };
  }
}
