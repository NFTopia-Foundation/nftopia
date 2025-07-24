import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { WebhookSignatureService } from '../src/transactions/services/webhook-signature.service';
import { TransactionStatus } from '../src/transactions/enums/transaction-status.enum';

describe('Webhook Integration (e2e)', () => {
  let app: INestApplication;
  let signatureService: WebhookSignatureService;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    signatureService = moduleFixture.get<WebhookSignatureService>(WebhookSignatureService);
    
    // Set test environment variables
    process.env.STARKNET_WEBHOOK_SECRET = 'test-secret-key';
    
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('/api/transactions/webhook (POST)', () => {
    const mockEvent = {
      txHash: '0x123456789abcdef',
      status: TransactionStatus.COMPLETED,
      blockTimestamp: '2024-01-01T00:00:00Z',
      blockNumber: 12345,
      logs: [
        {
          contractAddress: '0xabc123',
          eventType: 'Transfer',
          data: {
            from: '0x123',
            to: '0x456',
            tokenId: '789'
          }
        }
      ]
    };

    it('should accept valid webhook with correct signature', () => {
      const payload = JSON.stringify(mockEvent);
      const signature = signatureService.generateSignature(payload);

      return request(app.getHttpServer())
        .post('/api/transactions/webhook')
        .set('X-Starknet-Signature', `sha256=${signature}`)
        .send(mockEvent)
        .expect(202);
    });

    it('should reject webhook with missing signature', () => {
      return request(app.getHttpServer())
        .post('/api/transactions/webhook')
        .send(mockEvent)
        .expect(401)
        .expect((res) => {
          expect(res.body.message).toContain('Missing X-Starknet-Signature header');
        });
    });

    it('should reject webhook with invalid signature', () => {
      return request(app.getHttpServer())
        .post('/api/transactions/webhook')
        .set('X-Starknet-Signature', 'invalid-signature')
        .send(mockEvent)
        .expect(401)
        .expect((res) => {
          expect(res.body.message).toContain('Invalid signature');
        });
    });

    it('should reject webhook with invalid payload', () => {
      const invalidEvent = {
        txHash: '', // Invalid: empty string
        status: 'invalid-status', // Invalid: not in enum
        blockTimestamp: 'invalid-date', // Invalid: not ISO date
        blockNumber: -1, // Invalid: negative number
        logs: 'not-an-array' // Invalid: not an array
      };

      const payload = JSON.stringify(invalidEvent);
      const signature = signatureService.generateSignature(payload);

      return request(app.getHttpServer())
        .post('/api/transactions/webhook')
        .set('X-Starknet-Signature', `sha256=${signature}`)
        .send(invalidEvent)
        .expect(400);
    });

    it('should handle rate limiting', async () => {
      const payload = JSON.stringify(mockEvent);
      const signature = signatureService.generateSignature(payload);

      // Make multiple requests quickly to trigger rate limiting
      const requests = Array(105).fill(null).map(() => 
        request(app.getHttpServer())
          .post('/api/transactions/webhook')
          .set('X-Starknet-Signature', `sha256=${signature}`)
          .send(mockEvent)
      );

      const responses = await Promise.all(requests);
      
      // Some requests should be rate limited (429)
      const rateLimitedResponses = responses.filter(res => res.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });

  describe('/api/transactions/webhook/metrics (GET)', () => {
    it('should require authentication', () => {
      return request(app.getHttpServer())
        .get('/api/transactions/webhook/metrics')
        .expect(401);
    });

  });

  describe('/api/transactions/webhook/metrics/health (GET)', () => {
    it('should require authentication', () => {
      return request(app.getHttpServer())
        .get('/api/transactions/webhook/metrics/health')
        .expect(401);
    });
  });
});
