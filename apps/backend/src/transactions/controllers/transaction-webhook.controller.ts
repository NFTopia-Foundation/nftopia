import {
  Controller,
  Post,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
  BadRequestException,
  Logger,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { StarknetTransactionEvent } from '../dto/starknet-transaction-event.dto';
import { WebhookSignatureService } from '../services/webhook-signature.service';
import { WebhookProcessorService } from '../services/webhook-processor.service';
import { WebhookMetricsService } from '../services/webhook-metrics.service';
import { MultiTierRateLimitGuard } from '../guards/multi-tier-rate-limit.guard';

@Controller('api/transactions/webhook')
@UseGuards(MultiTierRateLimitGuard)
export class TransactionWebhookController {
  private readonly logger = new Logger(TransactionWebhookController.name);

  constructor(
    private readonly signatureService: WebhookSignatureService,
    private readonly processorService: WebhookProcessorService,
    private readonly metricsService: WebhookMetricsService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  async handleTransactionEvent(
    @Headers('x-starknet-signature') signature: string,
    @Body() event: StarknetTransactionEvent,
    @Req() request: Request,
  ): Promise<void> {
    const startTime = Date.now();
    
    try {
      this.logger.log(`Received webhook event for transaction: ${event.txHash}`);

      // Validate signature header
      if (!signature) {
        throw new UnauthorizedException('Missing X-Starknet-Signature header');
      }

      // Get raw body for signature verification
      const rawBody = JSON.stringify(event);
      
      // Verify HMAC signature
      const isValidSignature = this.signatureService.verifySignature(signature, rawBody);
      if (!isValidSignature) {
        this.logger.warn(`Invalid signature for transaction: ${event.txHash}`);
        throw new UnauthorizedException('Invalid signature');
      }

      this.logger.log(`Signature verified for transaction: ${event.txHash}`);

      // Process event asynchronously (fire and forget)
      setImmediate(() => {
        this.processorService.processTransactionEvent(event).catch((error) => {
          this.logger.error(`Async processing failed for ${event.txHash}:`, error);
        });
      });

      const processingTime = Date.now() - startTime;
      this.metricsService.recordSuccess(processingTime);
      this.logger.log(`Webhook processed in ${processingTime}ms for transaction: ${event.txHash}`);

    } catch (error) {
      const processingTime = Date.now() - startTime;
      this.metricsService.recordFailure(processingTime);
      this.logger.error(`Webhook processing failed in ${processingTime}ms:`, error);
      
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      
      throw new BadRequestException('Failed to process webhook event');
    }
  }
}
