// src/tests/email-webhooks.controller.test.ts
import { Request, Response } from 'express';
import { EmailWebhooksController } from '../controllers/email-webhooks.controller';
import { BounceService } from '../services/email-bounce.service';
import { SuppressionService } from '../services/suppressionService';

describe('EmailWebhooksController', () => {
  let controller: EmailWebhooksController;
  let mockBounceService: jest.Mocked<BounceService>;
  let mockSuppressionService: jest.Mocked<SuppressionService>;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  // Sample test events
  const sampleBounceEvent = {
    email: 'bounce@example.com',
    timestamp: Date.now(),
    event: 'bounce' as const,
    type: 'hard' as const,
    reason: 'mailbox not found'
  };

  const sampleSpamEvent = {
    email: 'spam@example.com',
    timestamp: Date.now(),
    event: 'spamreport' as const
  };

  const sampleBlockedEvent = {
    email: 'blocked@example.com',
    timestamp: Date.now(),
    event: 'blocked' as const,
    reason: 'content filter'
  };

  const sampleDeliveredEvent = {
    email: 'delivered@example.com',
    timestamp: Date.now(),
    event: 'delivered' as const
  };

  beforeEach(() => {
    // Create mock services
    mockBounceService = {
      process: jest.fn().mockResolvedValue(undefined),
      handleBlocked: jest.fn().mockResolvedValue(undefined)
    } as any;

    mockSuppressionService = {
      addWithReason: jest.fn().mockResolvedValue(undefined)
    } as any;

    // Initialize controller with mock services
    controller = new EmailWebhooksController(mockBounceService, mockSuppressionService);

    // Setup mock response
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis()
    };

    // Reset environment variables
    process.env.SENDGRID_WEBHOOK_SECRET = 'test-secret';
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Webhook Authentication', () => {
    it('should reject requests without auth token', async () => {
      mockRequest = {
        body: [sampleBounceEvent],
        headers: {}
      };

      await controller.handleEvent(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Unauthorized webhook request' });
    });

    it('should reject requests with invalid token', async () => {
      mockRequest = {
        body: [sampleBounceEvent],
        headers: { 'x-sendgrid-webhook-token': 'invalid-token' }
      };

      await controller.handleEvent(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
    });

    it('should accept requests with valid token', async () => {
      mockRequest = {
        body: [sampleBounceEvent],
        headers: { 'x-sendgrid-webhook-token': 'test-secret' }
      };

      await controller.handleEvent(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });
  });

  describe('Event Processing', () => {
    it('should process bounce events', async () => {
      mockRequest = {
        body: [sampleBounceEvent],
        headers: { 'x-sendgrid-webhook-token': 'test-secret' }
      };

      await controller.handleEvent(mockRequest as Request, mockResponse as Response);

      expect(mockBounceService.process).toHaveBeenCalledWith(sampleBounceEvent);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    it('should handle bounce events missing type field', async () => {
      const bounceWithoutType = { ...sampleBounceEvent, type: undefined };
      mockRequest = {
        body: [bounceWithoutType],
        headers: { 'x-sendgrid-webhook-token': 'test-secret' }
      };

      await controller.handleEvent(mockRequest as Request, mockResponse as Response);

      expect(mockBounceService.process).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'hard' })
      );
    });

    it('should process spam reports', async () => {
      mockRequest = {
        body: [sampleSpamEvent],
        headers: { 'x-sendgrid-webhook-token': 'test-secret' }
      };

      await controller.handleEvent(mockRequest as Request, mockResponse as Response);

      expect(mockSuppressionService.addWithReason).toHaveBeenCalledWith(
        sampleSpamEvent.email,
        'spam_report'
      );
    });

    it('should process blocked events', async () => {
      mockRequest = {
        body: [sampleBlockedEvent],
        headers: { 'x-sendgrid-webhook-token': 'test-secret' }
      };

      await controller.handleEvent(mockRequest as Request, mockResponse as Response);

      expect(mockBounceService.handleBlocked).toHaveBeenCalledWith(
        sampleBlockedEvent.email,
        sampleBlockedEvent.reason
      );
    });

    it('should skip delivered events', async () => {
      mockRequest = {
        body: [sampleDeliveredEvent],
        headers: { 'x-sendgrid-webhook-token': 'test-secret' }
      };

      await controller.handleEvent(mockRequest as Request, mockResponse as Response);

      expect(mockBounceService.process).not.toHaveBeenCalled();
      expect(mockSuppressionService.addWithReason).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    it('should log unhandled event types', async () => {
      const unhandledEvent = { ...sampleBounceEvent, event: 'unsubscribe' as any };
      mockRequest = {
        body: [unhandledEvent],
        headers: { 'x-sendgrid-webhook-token': 'test-secret' }
      };

      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      await controller.handleEvent(mockRequest as Request, mockResponse as Response);

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        `Unhandled event type: ${unhandledEvent.event}`
      );
      consoleWarnSpy.mockRestore();
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid payload format', async () => {
      mockRequest = {
        body: {}, // Not an array
        headers: { 'x-sendgrid-webhook-token': 'test-secret' }
      };

      await controller.handleEvent(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Invalid payload format'
      });
    });

    it('should handle service errors gracefully', async () => {
      mockRequest = {
        body: [sampleBounceEvent],
        headers: { 'x-sendgrid-webhook-token': 'test-secret' }
      };

      const testError = new Error('Test error');
      mockBounceService.process.mockRejectedValue(testError);

      await controller.handleEvent(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Internal server error',
        details: 'Test error'
      });
    });
  });

  describe('Parallel Processing', () => {
    it('should process multiple events in parallel', async () => {
      mockRequest = {
        body: [sampleBounceEvent, sampleSpamEvent, sampleBlockedEvent],
        headers: { 'x-sendgrid-webhook-token': 'test-secret' }
      };

      await controller.handleEvent(mockRequest as Request, mockResponse as Response);

      expect(mockBounceService.process).toHaveBeenCalledTimes(1);
      expect(mockSuppressionService.addWithReason).toHaveBeenCalledTimes(1);
      expect(mockBounceService.handleBlocked).toHaveBeenCalledTimes(1);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    it('should complete even if some events fail', async () => {
      mockRequest = {
        body: [sampleBounceEvent, sampleSpamEvent],
        headers: { 'x-sendgrid-webhook-token': 'test-secret' }
      };

      mockBounceService.process.mockRejectedValueOnce(new Error('Bounce failed'));

      await controller.handleEvent(mockRequest as Request, mockResponse as Response);

      expect(mockBounceService.process).toHaveBeenCalled();
      expect(mockSuppressionService.addWithReason).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });
  });
});
