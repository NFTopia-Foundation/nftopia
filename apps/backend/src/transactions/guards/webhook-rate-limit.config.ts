import { Request } from 'express';

/**
 * Webhook-specific rate limiting configuration
 */
export const WEBHOOK_RATE_LIMIT_CONFIG = {
  // 100 requests per minute as specified in requirements
  limit: 100,
  windowMs: 60 * 1000, // 1 minute
  
  // Custom key generator for webhook requests
  keyGenerator: (request: Request): string => {
    // For webhooks, we might want to rate limit by:
    // 1. IP address (primary)
    // 2. User-Agent (secondary, to catch different webhook sources)
    // 3. Custom header if available
    
    const ip = getClientIp(request);
    const userAgent = request.headers['user-agent'] || 'unknown';
    const webhookSource = request.headers['x-webhook-source'] as string;
    
    // Create a composite key for more granular rate limiting
    if (webhookSource) {
      return `webhook:${webhookSource}:${ip}`;
    }
    
    // Fallback to IP-based rate limiting
    return `webhook:${ip}`;
  },
  
  // Don't count failed requests (4xx/5xx) towards rate limit
  // This prevents attackers from exhausting rate limits with invalid requests
  skipFailedRequests: true,
};

/**
 * Burst protection configuration for webhook endpoints
 * Allows short bursts but prevents sustained high-rate attacks
 */
export const WEBHOOK_BURST_PROTECTION_CONFIG = {
  // Allow 20 requests in 10 seconds (burst)
  limit: 20,
  windowMs: 10 * 1000, // 10 seconds
  
  keyGenerator: (request: Request): string => {
    const ip = getClientIp(request);
    return `burst:${ip}`;
  },
};

/**
 * Per-transaction rate limiting to prevent duplicate submissions
 */
export const TRANSACTION_RATE_LIMIT_CONFIG = {
  // Maximum 5 events per transaction hash per minute
  limit: 5,
  windowMs: 60 * 1000,
  
  keyGenerator: (request: Request): string => {
    const ip = getClientIp(request);
    const txHash = request.body?.txHash || 'unknown';
    return `tx:${txHash}:${ip}`;
  },
};

/**
 * Extract client IP from request with proper proxy handling
 */
function getClientIp(request: Request): string {
  // Try multiple headers to get the real client IP
  const forwarded = request.headers['x-forwarded-for'] as string;
  const realIp = request.headers['x-real-ip'] as string;
  const cfConnectingIp = request.headers['cf-connecting-ip'] as string;
  
  let clientIp = 'unknown';
  
  if (forwarded) {
    // X-Forwarded-For can contain multiple IPs, take the first one
    clientIp = forwarded.split(',')[0].trim();
  } else if (realIp) {
    clientIp = realIp;
  } else if (cfConnectingIp) {
    clientIp = cfConnectingIp;
  } else if (request.connection?.remoteAddress) {
    clientIp = request.connection.remoteAddress;
  } else if (request.socket?.remoteAddress) {
    clientIp = request.socket.remoteAddress;
  }

  // Remove IPv6 prefix if present
  if (clientIp.startsWith('::ffff:')) {
    clientIp = clientIp.substring(7);
  }

  return clientIp;
}

/**
 * Rate limiting configuration for different webhook scenarios
 */
export const WEBHOOK_RATE_LIMITS = {
  // Standard webhook rate limit
  standard: WEBHOOK_RATE_LIMIT_CONFIG,
  
  // Burst protection (short-term high rate)
  burst: WEBHOOK_BURST_PROTECTION_CONFIG,
  
  // Per-transaction limiting
  transaction: TRANSACTION_RATE_LIMIT_CONFIG,
  
  // Strict rate limit for suspicious IPs
  strict: {
    limit: 10,
    windowMs: 60 * 1000,
    keyGenerator: (request: Request): string => {
      return `strict:${getClientIp(request)}`;
    },
  },
  
  // Generous rate limit for trusted sources
  trusted: {
    limit: 500,
    windowMs: 60 * 1000,
    keyGenerator: (request: Request): string => {
      return `trusted:${getClientIp(request)}`;
    },
  },
};
