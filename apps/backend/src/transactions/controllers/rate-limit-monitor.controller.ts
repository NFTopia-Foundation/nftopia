import { 
  Controller, 
  Get, 
  Post, 
  Delete, 
  Param, 
  UseGuards, 
  Req,
  Query,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../../auth/jwt.guard';
import { MultiTierRateLimitGuard } from '../guards/multi-tier-rate-limit.guard';
import { RateLimitGuard } from '../guards/rate-limit.guard';

@Controller('api/transactions/rate-limit')
@UseGuards(JwtAuthGuard) // Protect all rate limit monitoring endpoints
export class RateLimitMonitorController {
  constructor(
    private readonly multiTierGuard: MultiTierRateLimitGuard,
    private readonly basicGuard: RateLimitGuard,
  ) {}

  @Get('status')
  getRateLimitStatus() {
    const multiTierStatus = this.multiTierGuard.getRateLimitStatus();
    const basicStatus = this.basicGuard.getRateLimitStatus();

    return {
      multiTier: multiTierStatus,
      basic: basicStatus,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('check')
  checkRateLimit(@Req() request: Request) {
    const multiTierCheck = this.multiTierGuard.isRateLimited(request);
    
    return {
      isRateLimited: multiTierCheck.isLimited,
      limitedTiers: multiTierCheck.limitedTiers,
      nextResetTime: multiTierCheck.nextResetTime 
        ? new Date(multiTierCheck.nextResetTime).toISOString() 
        : null,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('check/:ip')
  checkRateLimitForIp(@Param('ip') ip: string) {
    // Create a mock request object for the IP
    const mockRequest = {
      headers: {},
      connection: { remoteAddress: ip },
      socket: { remoteAddress: ip },
      body: { txHash: 'test-hash' },
    } as any;

    const multiTierCheck = this.multiTierGuard.isRateLimited(mockRequest);
    
    return {
      ip,
      isRateLimited: multiTierCheck.isLimited,
      limitedTiers: multiTierCheck.limitedTiers,
      nextResetTime: multiTierCheck.nextResetTime 
        ? new Date(multiTierCheck.nextResetTime).toISOString() 
        : null,
      timestamp: new Date().toISOString(),
    };
  }

  @Post('reset/:key')
  resetRateLimit(@Param('key') key: string) {
    const multiTierReset = this.multiTierGuard.resetRateLimit(key);
    const basicReset = this.basicGuard.resetRateLimit(key);

    return {
      key,
      multiTierReset,
      basicReset,
      timestamp: new Date().toISOString(),
    };
  }

  @Delete('reset-all')
  resetAllRateLimits() {
    this.multiTierGuard.resetAllRateLimits();
    
    return {
      message: 'All rate limits have been reset',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('config')
  getRateLimitConfig() {
    return {
      multiTier: {
        description: 'Multi-tier rate limiting with burst protection',
        tiers: {
          burst: {
            limit: 20,
            windowMs: 10000,
            description: 'Short-term burst protection (20 req/10s)',
          },
          standard: {
            limit: 100,
            windowMs: 60000,
            description: 'Standard rate limit (100 req/min)',
          },
          transaction: {
            limit: 5,
            windowMs: 60000,
            description: 'Per-transaction rate limit (5 req/min per tx)',
          },
        },
      },
      basic: {
        description: 'Basic IP-based rate limiting',
        limit: 100,
        windowMs: 60000,
      },
      headers: {
        'X-RateLimit-Limit': 'Maximum requests allowed in the window',
        'X-RateLimit-Remaining': 'Requests remaining in current window',
        'X-RateLimit-Reset': 'Unix timestamp when the window resets',
        'X-RateLimit-Reset-After': 'Seconds until the window resets',
        'Retry-After': 'Seconds to wait before retrying (when rate limited)',
      },
    };
  }

  @Get('analytics')
  getRateLimitAnalytics(@Query('hours') hours: string = '1') {
    const hoursNum = parseInt(hours, 10) || 1;
    const status = this.multiTierGuard.getRateLimitStatus();
    
    // In a real implementation, you would store historical data
    // For now, we'll return current status with mock analytics
    return {
      timeRange: `Last ${hoursNum} hour(s)`,
      current: status,
      analytics: {
        totalRequests: status.totalEntries * 10, // Mock data
        blockedRequests: Math.floor(status.totalEntries * 0.05), // Mock 5% blocked
        topIPs: [
          { ip: '192.168.1.100', requests: 45, blocked: 2 },
          { ip: '10.0.0.50', requests: 32, blocked: 0 },
          { ip: '172.16.0.25', requests: 28, blocked: 1 },
        ],
        tierBreakdown: status.entriesByTier,
      },
      timestamp: new Date().toISOString(),
    };
  }

  @Get('health')
  getRateLimitHealth() {
    const status = this.multiTierGuard.getRateLimitStatus();
    const memoryUsageMB = parseFloat(status.memoryUsage.replace(' MB', ''));
    
    // Health thresholds
    const maxMemoryMB = 100; // 100MB threshold
    const maxEntries = 10000; // 10k entries threshold
    
    const isHealthy = memoryUsageMB < maxMemoryMB && status.totalEntries < maxEntries;
    
    return {
      status: isHealthy ? 'healthy' : 'warning',
      checks: {
        memoryUsage: {
          status: memoryUsageMB < maxMemoryMB ? 'pass' : 'fail',
          value: memoryUsageMB,
          threshold: maxMemoryMB,
          unit: 'MB',
        },
        totalEntries: {
          status: status.totalEntries < maxEntries ? 'pass' : 'fail',
          value: status.totalEntries,
          threshold: maxEntries,
          unit: 'entries',
        },
      },
      details: status,
      timestamp: new Date().toISOString(),
    };
  }
}
