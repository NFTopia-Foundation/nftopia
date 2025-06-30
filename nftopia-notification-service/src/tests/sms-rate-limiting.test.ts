import request from 'supertest';
import app from '../app';
import smsService from '../services/smsService';
import redisService from '../services/redisService';

// Mock Twilio client
jest.mock('twilio', () => {
  return jest.fn().mockImplementation(() => ({
    messages: {
      create: jest.fn().mockResolvedValue({
        sid: 'test-message-sid-123',
      }),
    },
    api: {
      accounts: jest.fn().mockReturnValue({
        fetch: jest.fn().mockResolvedValue({}),
      }),
    },
  }));
});

// Mock Redis service
jest.mock('../services/redisService', () => ({
  connect: jest.fn(),
  disconnect: jest.fn(),
  isRateLimited: jest.fn(),
  getRateLimitInfo: jest.fn(),
  recordAbuseAttempt: jest.fn(),
  getAbuseAttempts: jest.fn(),
  healthCheck: jest.fn(),
}));

describe('SMS Rate Limiting', () => {
  const testUserId = 'user-123';
  const testPhoneNumber = '+1234567890';

  beforeEach(() => {
    jest.clearAllMocks();
    (redisService.connect as jest.Mock).mockResolvedValue(undefined);
    (redisService.isRateLimited as jest.Mock).mockResolvedValue(false);
    (redisService.getRateLimitInfo as jest.Mock).mockResolvedValue({
      current: 1,
      limit: 5,
      window: 3600,
      resetTime: Date.now() + 3600000,
      remaining: 4,
    });
  });

  describe('Bid Alert SMS', () => {
    it('should send bid alert SMS successfully', async () => {
      const response = await request(app)
        .post('/api/v1/sms/bid-alert')
        .send({
          userId: testUserId,
          to: testPhoneNumber,
          bidAmount: '1.5 ETH',
          nftName: 'Cool NFT #123',
          currentHighestBid: '1.4 ETH',
          auctionEndDate: '2024-01-15T18:00:00Z',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.messageId).toBe('test-message-sid-123');
      expect(response.body.remainingQuota).toBe(4);
    });

    it('should return 429 when rate limit exceeded', async () => {
      (redisService.isRateLimited as jest.Mock).mockResolvedValue(true);
      (redisService.getRateLimitInfo as jest.Mock).mockResolvedValue({
        current: 5,
        limit: 5,
        window: 3600,
        resetTime: Date.now() + 3600000,
        remaining: 0,
      });

      const response = await request(app)
        .post('/api/v1/sms/bid-alert')
        .send({
          userId: testUserId,
          to: testPhoneNumber,
          bidAmount: '1.5 ETH',
          nftName: 'Cool NFT #123',
        });

      expect(response.status).toBe(429);
      expect(response.body.rateLimited).toBe(true);
      expect(response.body.retryAfter).toBe('1 hour');
    });
  });

  describe('Marketing SMS', () => {
    it('should send marketing SMS successfully', async () => {
      const response = await request(app)
        .post('/api/v1/sms/marketing')
        .send({
          userId: testUserId,
          to: testPhoneNumber,
          announcementTitle: 'New Feature Launch',
          announcementContent: 'Check out our latest NFT marketplace features!',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should return 429 when rate limit exceeded', async () => {
      (redisService.isRateLimited as jest.Mock).mockResolvedValue(true);
      (redisService.getRateLimitInfo as jest.Mock).mockResolvedValue({
        current: 2,
        limit: 2,
        window: 86400,
        resetTime: Date.now() + 86400000,
        remaining: 0,
      });

      const response = await request(app)
        .post('/api/v1/sms/marketing')
        .send({
          userId: testUserId,
          to: testPhoneNumber,
          announcementTitle: 'New Feature Launch',
          announcementContent: 'Check out our latest NFT marketplace features!',
        });

      expect(response.status).toBe(429);
      expect(response.body.retryAfter).toBe('24 hours');
    });
  });

  describe('2FA SMS', () => {
    it('should send 2FA SMS successfully (bypassable)', async () => {
      const response = await request(app)
        .post('/api/v1/sms/2fa')
        .send({
          userId: testUserId,
          to: testPhoneNumber,
          code: '123456',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should not be rate limited (bypassable)', async () => {
      (redisService.isRateLimited as jest.Mock).mockResolvedValue(true);

      const response = await request(app)
        .post('/api/v1/sms/2fa')
        .send({
          userId: testUserId,
          to: testPhoneNumber,
          code: '123456',
        });

      // Should still succeed because 2FA is bypassable
      expect(response.status).toBe(200);
    });
  });

  describe('NFT Purchase SMS', () => {
    it('should send NFT purchase SMS successfully (bypassable)', async () => {
      const response = await request(app)
        .post('/api/v1/sms/nft-purchase')
        .send({
          userId: testUserId,
          to: testPhoneNumber,
          nftName: 'Cool NFT #123',
          purchasePrice: '2.5 ETH',
          transactionHash: '0x1234567890abcdef',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should not be rate limited (bypassable)', async () => {
      (redisService.isRateLimited as jest.Mock).mockResolvedValue(true);

      const response = await request(app)
        .post('/api/v1/sms/nft-purchase')
        .send({
          userId: testUserId,
          to: testPhoneNumber,
          nftName: 'Cool NFT #123',
          purchasePrice: '2.5 ETH',
          transactionHash: '0x1234567890abcdef',
        });

      // Should still succeed because NFT purchase is bypassable
      expect(response.status).toBe(200);
    });
  });

  describe('Rate Limit Info', () => {
    it('should return rate limit info', async () => {
      const response = await request(app)
        .get(`/api/v1/sms/rate-limit/${testUserId}/bidAlert`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('current');
      expect(response.body.data).toHaveProperty('limit');
      expect(response.body.data).toHaveProperty('remaining');
    });
  });

  describe('Abuse Detection', () => {
    it('should return abuse attempts', async () => {
      (redisService.getAbuseAttempts as jest.Mock).mockResolvedValue([
        {
          userId: testUserId,
          notificationType: 'bidAlert',
          attemptCount: 1,
          timestamp: new Date(),
        },
      ]);

      const response = await request(app)
        .get(`/api/v1/sms/abuse/${testUserId}/bidAlert`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
    });
  });

  describe('Health Check', () => {
    it('should return healthy status', async () => {
      (redisService.healthCheck as jest.Mock).mockResolvedValue({
        status: 'healthy',
      });

      const response = await request(app)
        .get('/api/v1/sms/health');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('healthy');
    });

    it('should return unhealthy status', async () => {
      (redisService.healthCheck as jest.Mock).mockResolvedValue({
        status: 'unhealthy',
        details: 'Redis connection failed',
      });

      const response = await request(app)
        .get('/api/v1/sms/health');

      expect(response.status).toBe(503);
      expect(response.body.status).toBe('unhealthy');
    });
  });

  describe('SMS Template Personalization', () => {
    const smsServiceInstance = new smsService();

    it('should render a Handlebars template with variables and helpers', () => {
      const template = '[NFTopia] Outbid on {{nft.name}} ({{formatEth oldBid}} → {{formatEth newBid}}). {{truncateTx txHash}}';
      const data = {
        nft: { name: 'Cool NFT #123', id: '0xabc123' },
        oldBid: 1.23456,
        newBid: 2.34567,
        txHash: '0x1234567890abcdef',
      };
      const result = (smsServiceInstance as any).formatMessage(template, data);
      expect(result).toContain('Outbid on Cool NFT #123 (1.23 ETH → 2.35 ETH). 0x1234...cdef');
    });

    it('should truncate message to 160 chars for GSM-7', () => {
      const template = '[NFTopia] {{longText}}';
      const data = { longText: 'a'.repeat(200) };
      const result = (smsServiceInstance as any).formatMessage(template, data);
      expect(result.length).toBeLessThanOrEqual(160);
      expect(result.endsWith('…')).toBe(true);
    });

    it('should truncate message to 70 chars for UCS-2', () => {
      const template = '[NFTopia] {{longText}}';
      const data = { longText: '😀'.repeat(100) };
      const result = (smsServiceInstance as any).formatMessage(template, data);
      expect(result.length).toBeLessThanOrEqual(70);
      expect(result.endsWith('…')).toBe(true);
    });

    it('should use blockExplorer helper', () => {
      const template = 'View: {{blockExplorer nft.id}}';
      const data = { nft: { id: '0xabc123' } };
      const result = (smsServiceInstance as any).formatMessage(template, data);
      expect(result).toContain('https://etherscan.io/token/0xabc123');
    });

    it('should use the correct locale template if available', () => {
      const templateObj = { en: 'Hello {{name}}', es: 'Hola {{name}}' };
      const data = { name: 'Juan' };
      const result = (smsServiceInstance as any).formatMessage(templateObj['es'], data, 'es');
      expect(result).toBe('Hola Juan');
    });
  });
}); 