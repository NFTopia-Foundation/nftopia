import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class WebhookSignatureService {
  constructor(private configService: ConfigService) {}

  /**
   * Verify HMAC-SHA256 signature for webhook payload
   * @param signature The signature from X-Starknet-Signature header
   * @param payload The raw request body
   * @returns boolean indicating if signature is valid
   */
  verifySignature(signature: string, payload: string): boolean {
    try {
      const secret = this.configService.get<string>('STARKNET_WEBHOOK_SECRET');
      
      if (!secret) {
        throw new UnauthorizedException('Webhook secret not configured');
      }

      // Remove 'sha256=' prefix if present
      const cleanSignature = signature.replace(/^sha256=/, '');
      
      // Generate expected signature
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(payload, 'utf8')
        .digest('hex');

      // Use timing-safe comparison to prevent timing attacks
      return crypto.timingSafeEqual(
        Buffer.from(cleanSignature, 'hex'),
        Buffer.from(expectedSignature, 'hex')
      );
    } catch (error) {
      console.error('Signature verification failed:', error);
      return false;
    }
  }

  /**
   * Generate signature for testing purposes
   * @param payload The payload to sign
   * @returns The HMAC-SHA256 signature
   */
  generateSignature(payload: string): string {
    const secret = this.configService.get<string>('STARKNET_WEBHOOK_SECRET');
    
    if (!secret) {
      throw new Error('Webhook secret not configured');
    }

    return crypto
      .createHmac('sha256', secret)
      .update(payload, 'utf8')
      .digest('hex');
  }
}
