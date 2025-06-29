import { createClient, RedisClientType } from 'redis';
import { smsConfig } from '../config/sms';
import { NotificationType, RateLimitInfo, AbuseAlert } from '../types/sms';

class RedisService {
  private client: RedisClientType;
  private isConnected = false;

  constructor() {
    this.client = createClient({
      url: smsConfig.redis.url,
    });

    this.client.on('error', (err) => {
      console.error('Redis Client Error:', err);
    });

    this.client.on('connect', () => {
      console.log('Redis Client Connected');
      this.isConnected = true;
    });

    this.client.on('disconnect', () => {
      console.log('Redis Client Disconnected');
      this.isConnected = false;
    });
  }

  async connect(): Promise<void> {
    if (!this.isConnected) {
      await this.client.connect();
    }
  }

  async disconnect(): Promise<void> {
    if (this.isConnected) {
      await this.client.quit();
    }
  }

  /**
   * Check rate limit for a user and notification type
   */
  async checkRateLimit(userId: string, notificationType: NotificationType): Promise<RateLimitInfo> {
    const config = smsConfig.rateLimits[notificationType];
    const key = `${smsConfig.redis.prefix}:limit:${userId}:${notificationType}`;
    
    if (config.bypassable || config.limit === -1) {
      return {
        current: 0,
        limit: -1,
        window: config.window,
        resetTime: Date.now() + config.window * 1000,
        remaining: -1,
      };
    }

    const now = Date.now();
    const windowStart = now - (config.window * 1000);
    
    // Get current count
    const currentCount = await this.client.zcount(key, windowStart, '+inf');
    
    // Remove expired entries
    await this.client.zremrangebyscore(key, '-inf', windowStart - 1);
    
    // Add current request
    await this.client.zadd(key, now, now.toString());
    
    // Set expiry on the key
    await this.client.expire(key, config.window);
    
    const remaining = Math.max(0, config.limit - currentCount - 1);
    
    return {
      current: currentCount + 1,
      limit: config.limit,
      window: config.window,
      resetTime: now + config.window * 1000,
      remaining,
    };
  }

  /**
   * Check if rate limit is exceeded
   */
  async isRateLimited(userId: string, notificationType: NotificationType): Promise<boolean> {
    const rateLimitInfo = await this.checkRateLimit(userId, notificationType);
    const config = smsConfig.rateLimits[notificationType];
    
    if (config.bypassable || config.limit === -1) {
      return false;
    }
    
    return rateLimitInfo.current > config.limit;
  }

  /**
   * Get rate limit info without incrementing
   */
  async getRateLimitInfo(userId: string, notificationType: NotificationType): Promise<RateLimitInfo> {
    const config = smsConfig.rateLimits[notificationType];
    const key = `${smsConfig.redis.prefix}:limit:${userId}:${notificationType}`;
    
    if (config.bypassable || config.limit === -1) {
      return {
        current: 0,
        limit: -1,
        window: config.window,
        resetTime: Date.now() + config.window * 1000,
        remaining: -1,
      };
    }

    const now = Date.now();
    const windowStart = now - (config.window * 1000);
    
    // Get current count without incrementing
    const currentCount = await this.client.zcount(key, windowStart, '+inf');
    
    return {
      current: currentCount,
      limit: config.limit,
      window: config.window,
      resetTime: now + config.window * 1000,
      remaining: Math.max(0, config.limit - currentCount),
    };
  }

  /**
   * Record abuse attempt
   */
  async recordAbuseAttempt(abuseAlert: AbuseAlert): Promise<void> {
    const key = `${smsConfig.redis.prefix}:abuse:${abuseAlert.userId}:${abuseAlert.notificationType}`;
    const abuseData = {
      ...abuseAlert,
      timestamp: abuseAlert.timestamp.toISOString(),
    };
    
    await this.client.lpush(key, JSON.stringify(abuseData));
    await this.client.expire(key, 86400); // Keep for 24 hours
  }

  /**
   * Get abuse attempts for a user
   */
  async getAbuseAttempts(userId: string, notificationType: NotificationType): Promise<AbuseAlert[]> {
    const key = `${smsConfig.redis.prefix}:abuse:${userId}:${notificationType}`;
    const attempts = await this.client.lrange(key, 0, -1);
    
    return attempts.map(attempt => {
      const data = JSON.parse(attempt);
      return {
        ...data,
        timestamp: new Date(data.timestamp),
      };
    });
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; details?: string }> {
    try {
      await this.client.ping();
      return { status: 'healthy' };
    } catch (error) {
      return { 
        status: 'unhealthy', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }
}

export default new RedisService(); 