import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { MultiTierRateLimitGuard } from './multi-tier-rate-limit.guard';
import { Request, Response } from 'express';

describe('MultiTierRateLimitGuard', () => {
  let guard: MultiTierRateLimitGuard;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockContext: Partial<ExecutionContext>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MultiTierRateLimitGuard],
    }).compile();

    guard = module.get<MultiTierRateLimitGuard>(MultiTierRateLimitGuard);

    mockResponse = {
      setHeader: jest.fn(),
    };

    mockRequest = {
      headers: {},
      connection: { remoteAddress: '192.168.1.100' },
      body: { txHash: 'test-hash-123' },
    };

    mockContext = {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
        getResponse: () => mockResponse,
      }),
    } as any;
  });

  afterEach(() => {
    // Clean up rate limits after each test
    guard.resetAllRateLimits();
  });

  describe('canActivate', () => {
    it('should allow first request', () => {
      const result = guard.canActivate(mockContext as ExecutionContext);
      expect(result).toBe(true);
      expect(mockResponse.setHeader).toHaveBeenCalled();
    });

    it('should allow requests within burst limit', () => {
      // Make 19 requests (within burst limit of 20)
      for (let i = 0; i < 19; i++) {
        const result = guard.canActivate(mockContext as ExecutionContext);
        expect(result).toBe(true);
      }
    });

    it('should block requests exceeding burst limit', () => {
      // Make 20 requests to reach burst limit
      for (let i = 0; i < 20; i++) {
        guard.canActivate(mockContext as ExecutionContext);
      }

      // 21st request should be blocked
      expect(() => {
        guard.canActivate(mockContext as ExecutionContext);
      }).toThrow(HttpException);
    });

    it('should handle different IPs separately', () => {
      // Make requests from first IP
      for (let i = 0; i < 20; i++) {
        guard.canActivate(mockContext as ExecutionContext);
      }

      // Change IP and make request - should be allowed
      mockRequest.connection = { remoteAddress: '192.168.1.101' };
      const result = guard.canActivate(mockContext as ExecutionContext);
      expect(result).toBe(true);
    });

    it('should handle different transaction hashes separately', () => {
      // Make 5 requests for first transaction (at transaction limit)
      for (let i = 0; i < 5; i++) {
        guard.canActivate(mockContext as ExecutionContext);
      }

      // Change transaction hash - should be allowed
      mockRequest.body = { txHash: 'different-hash-456' };
      const result = guard.canActivate(mockContext as ExecutionContext);
      expect(result).toBe(true);
    });

    it('should set correct rate limit headers', () => {
      guard.canActivate(mockContext as ExecutionContext);

      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', expect.any(String));
      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', expect.any(String));
      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-RateLimit-Reset', expect.any(String));
      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-RateLimit-Reset-After', expect.any(String));
    });

    it('should include retry-after header when rate limited', () => {
      // Exceed burst limit
      for (let i = 0; i < 20; i++) {
        guard.canActivate(mockContext as ExecutionContext);
      }

      try {
        guard.canActivate(mockContext as ExecutionContext);
      } catch (error) {
        expect(error).toBeInstanceOf(HttpException);
        expect(error.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
        expect(mockResponse.setHeader).toHaveBeenCalledWith('Retry-After', expect.any(String));
      }
    });
  });

  describe('getRateLimitStatus', () => {
    it('should return correct status', () => {
      // Make some requests
      for (let i = 0; i < 5; i++) {
        guard.canActivate(mockContext as ExecutionContext);
      }

      const status = guard.getRateLimitStatus();
      expect(status).toHaveProperty('totalEntries');
      expect(status).toHaveProperty('entriesByTier');
      expect(status).toHaveProperty('memoryUsage');
      expect(status.totalEntries).toBeGreaterThan(0);
    });
  });

  describe('isRateLimited', () => {
    it('should return false for new request', () => {
      const result = guard.isRateLimited(mockRequest as Request);
      expect(result.isLimited).toBe(false);
      expect(result.limitedTiers).toHaveLength(0);
    });

    it('should return true when rate limited', () => {
      // Exceed burst limit
      for (let i = 0; i < 20; i++) {
        guard.canActivate(mockContext as ExecutionContext);
      }

      const result = guard.isRateLimited(mockRequest as Request);
      expect(result.isLimited).toBe(true);
      expect(result.limitedTiers).toContain('burst');
    });
  });

  describe('resetRateLimit', () => {
    it('should reset specific rate limit', () => {
      // Make some requests
      guard.canActivate(mockContext as ExecutionContext);
      
      const key = 'burst:192.168.1.100';
      const result = guard.resetRateLimit(key);
      expect(result).toBe(true);
    });

    it('should return false for non-existent key', () => {
      const result = guard.resetRateLimit('non-existent-key');
      expect(result).toBe(false);
    });
  });

  describe('resetAllRateLimits', () => {
    it('should reset all rate limits', () => {
      // Make some requests
      for (let i = 0; i < 5; i++) {
        guard.canActivate(mockContext as ExecutionContext);
      }

      guard.resetAllRateLimits();
      const status = guard.getRateLimitStatus();
      expect(status.totalEntries).toBe(0);
    });
  });

  describe('IP extraction', () => {
    it('should handle X-Forwarded-For header', () => {
      mockRequest.headers = {
        'x-forwarded-for': '203.0.113.1, 192.168.1.100',
      };

      const result = guard.canActivate(mockContext as ExecutionContext);
      expect(result).toBe(true);
    });

    it('should handle X-Real-IP header', () => {
      mockRequest.headers = {
        'x-real-ip': '203.0.113.1',
      };

      const result = guard.canActivate(mockContext as ExecutionContext);
      expect(result).toBe(true);
    });

    it('should handle CF-Connecting-IP header', () => {
      mockRequest.headers = {
        'cf-connecting-ip': '203.0.113.1',
      };

      const result = guard.canActivate(mockContext as ExecutionContext);
      expect(result).toBe(true);
    });

    it('should handle IPv6 addresses', () => {
      mockRequest.connection = { remoteAddress: '::ffff:192.168.1.100' };

      const result = guard.canActivate(mockContext as ExecutionContext);
      expect(result).toBe(true);
    });
  });
});
