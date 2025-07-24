import { Test, TestingModule } from '@nestjs/testing';
import { TransactionWebhookController } from './transaction-webhook.controller';
import { WebhookSignatureService } from '../services/webhook-signature.service';
import { WebhookProcessorService } from '../services/webhook-processor.service';
import { WebhookMetricsService } from '../services/webhook-metrics.service';
import { UnauthorizedException } from '@nestjs/common';
import { TransactionStatus } from '../enums/transaction-status.enum';

describe('TransactionWebhookController', () => {
  let controller: TransactionWebhookController;
  let signatureService: WebhookSignatureService;
  let processorService: WebhookProcessorService;
  let metricsService: WebhookMetricsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TransactionWebhookController],
      providers: [
        {
          provide: WebhookSignatureService,
          useValue: {
            verifySignature: jest.fn(),
          },
        },
        {
          provide: WebhookProcessorService,
          useValue: {
            processTransactionEvent: jest.fn(),
          },
        },
        {
          provide: WebhookMetricsService,
          useValue: {
            recordSuccess: jest.fn(),
            recordFailure: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<TransactionWebhookController>(TransactionWebhookController);
    signatureService = module.get<WebhookSignatureService>(WebhookSignatureService);
    processorService = module.get<WebhookProcessorService>(WebhookProcessorService);
    metricsService = module.get<WebhookMetricsService>(WebhookMetricsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('handleTransactionEvent', () => {
    const mockEvent = {
      txHash: '0x123456789abcdef',
      status: TransactionStatus.COMPLETED,
      blockTimestamp: '2024-01-01T00:00:00Z',
      blockNumber: 12345,
      logs: [],
    };

    const mockRequest = {} as any;

    it('should process valid webhook event', async () => {
      const signature = 'valid-signature';
      jest.spyOn(signatureService, 'verifySignature').mockReturnValue(true);
      jest.spyOn(processorService, 'processTransactionEvent').mockResolvedValue();

      await controller.handleTransactionEvent(signature, mockEvent, mockRequest);

      expect(signatureService.verifySignature).toHaveBeenCalledWith(
        signature,
        JSON.stringify(mockEvent)
      );
      expect(metricsService.recordSuccess).toHaveBeenCalled();
    });

    it('should reject webhook with missing signature', async () => {
      await expect(
        controller.handleTransactionEvent('', mockEvent, mockRequest)
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should reject webhook with invalid signature', async () => {
      const signature = 'invalid-signature';
      jest.spyOn(signatureService, 'verifySignature').mockReturnValue(false);

      await expect(
        controller.handleTransactionEvent(signature, mockEvent, mockRequest)
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should record failure metrics on error', async () => {
      const signature = 'valid-signature';
      jest.spyOn(signatureService, 'verifySignature').mockReturnValue(true);
      jest.spyOn(processorService, 'processTransactionEvent').mockRejectedValue(
        new Error('Processing failed')
      );

      try {
        await controller.handleTransactionEvent(signature, mockEvent, mockRequest);
      } catch (error) {
        // Expected to throw
      }

      expect(metricsService.recordFailure).toHaveBeenCalled();
    });
  });
});
