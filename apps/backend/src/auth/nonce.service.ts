import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

interface NonceRecord {
  value: string;
  expires: Date;
}

@Injectable()
export class NonceService {
  // In-memory storage for nonces with address as key
  private nonces: Map<string, NonceRecord> = new Map();
  
  // Nonce expiration time in milliseconds (10 minutes)
  private readonly NONCE_EXPIRATION_TIME = 10 * 60 * 1000;

  /**
   * Generate a new nonce for a wallet address
   */
  generateNonce(address: string): string {
    // Generate random nonce
    const nonce = crypto.randomBytes(32).toString('hex');
    
    // Store nonce with expiration
    const expirationDate = new Date(Date.now() + this.NONCE_EXPIRATION_TIME);
    this.nonces.set(address.toLowerCase(), {
      value: nonce,
      expires: expirationDate,
    });
    
    return nonce;
  }

  /**
   * Validate and consume a nonce for a wallet address
   */
  validateAndConsumeNonce(address: string, nonce: string): boolean {
    const lowerAddress = address.toLowerCase();
    const nonceRecord = this.nonces.get(lowerAddress);
    
    if (!nonceRecord) {
      return false; // No nonce found for this address
    }
    
    // Check if nonce has expired
    if (nonceRecord.expires < new Date()) {
      this.nonces.delete(lowerAddress);
      return false;
    }
    
    // Check if nonce matches
    const isValid = nonceRecord.value === nonce;
    
    // Consume nonce (delete it after use)
    this.nonces.delete(lowerAddress);
    
    return isValid;
  }

  /**
   * Clean up expired nonces
   */
  cleanupExpiredNonces(): void {
    const now = new Date();
    
    for (const [address, nonceRecord] of this.nonces.entries()) {
      if (nonceRecord.expires < now) {
        this.nonces.delete(address);
      }
    }
  }

  /**
   * Get message to sign for a given nonce
   */
  getMessageToSign(nonce: string): string {
    return `Sign this message to authenticate with our dApp. Nonce: ${nonce}`;
  }

  /**
   * Start periodic cleanup of expired nonces
   */
  startPeriodicCleanup(intervalMs = 5 * 60 * 1000): void {
    setInterval(() => this.cleanupExpiredNonces(), intervalMs);
  }
}