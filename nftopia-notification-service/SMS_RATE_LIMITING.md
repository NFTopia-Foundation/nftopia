# SMS Rate Limiting Implementation

This document describes the SMS rate limiting implementation for the NFTopia notification service, designed to protect against SMS abuse and comply with carrier requirements.

## Overview

The SMS rate limiting system enforces strict rate limits for NFT-related notifications while allowing critical transaction alerts to bypass limits when necessary. The implementation uses Redis for distributed rate limiting and provides real-time abuse detection.

## Rate Limit Rules

| Notification Type | Limit | Window | Bypassable | Description |
|------------------|-------|--------|------------|-------------|
| Bid Alerts | 5 | 1 hour | ❌ | Notifications for new bids on user's NFTs |
| Marketing | 2 | 24 hours | ❌ | Promotional and announcement messages |
| 2FA Codes | ∞ | - | ✅ | Two-factor authentication codes |
| NFT Purchase Confirmations | ∞ | - | ✅ | Purchase confirmation notifications |

## Architecture

### Components

1. **SMS Service** (`src/services/smsService.ts`)
   - Handles SMS sending via Twilio
   - Integrates with rate limiting logic
   - Provides retry mechanism with exponential backoff

2. **Redis Service** (`src/services/redisService.ts`)
   - Manages rate limiting counters using Redis sorted sets
   - Handles abuse detection and recording
   - Provides health checks

3. **SMS Controller** (`src/controllers/sms.controller.ts`)
   - HTTP request handling
   - Input validation
   - Proper HTTP status codes (429 for rate limits)

4. **Rate Limiting Middleware** (`src/middlewares/smsRateLimit.ts`)
   - Additional HTTP-level rate limiting
   - Configurable per notification type

### Redis Structure

```redis
# Rate limiting keys
limit:sms:{userId}:{type} -> Sorted set with timestamps

# Abuse detection keys
abuse:{userId}:{type} -> List of abuse attempts
```

## API Endpoints

### Send SMS Endpoints

#### POST `/api/v1/sms/bid-alert`
Send bid alert notifications (rate limited: 5/hour)

```json
{
  "userId": "user-123",
  "to": "+1234567890",
  "bidAmount": "1.5 ETH",
  "nftName": "Cool NFT #123",
  "currentHighestBid": "1.4 ETH",
  "auctionEndDate": "2024-01-15T18:00:00Z"
}
```

#### POST `/api/v1/sms/marketing`
Send marketing notifications (rate limited: 2/24h)

```json
{
  "userId": "user-123",
  "to": "+1234567890",
  "announcementTitle": "New Feature Launch",
  "announcementContent": "Check out our latest features!"
}
```

#### POST `/api/v1/sms/2fa`
Send 2FA codes (unlimited, bypassable)

```json
{
  "userId": "user-123",
  "to": "+1234567890",
  "code": "123456"
}
```

#### POST `/api/v1/sms/nft-purchase`
Send NFT purchase confirmations (unlimited, bypassable)

```json
{
  "userId": "user-123",
  "to": "+1234567890",
  "nftName": "Cool NFT #123",
  "purchasePrice": "2.5 ETH",
  "transactionHash": "0x1234567890abcdef"
}
```

### Rate Limiting Endpoints

#### GET `/api/v1/sms/rate-limit/:userId/:notificationType`
Get current rate limit information

```json
{
  "success": true,
  "data": {
    "current": 3,
    "limit": 5,
    "window": 3600,
    "resetTime": 1642248000000,
    "remaining": 2
  }
}
```

#### GET `/api/v1/sms/abuse/:userId/:notificationType`
Get abuse attempts for a user

```json
{
  "success": true,
  "data": [
    {
      "userId": "user-123",
      "notificationType": "bidAlert",
      "attemptCount": 1,
      "timestamp": "2024-01-15T10:30:00.000Z"
    }
  ]
}
```

#### GET `/api/v1/sms/health`
Health check endpoint

```json
{
  "success": true,
  "status": "healthy",
  "service": "SMS"
}
```

## Rate Limit Responses

When rate limits are exceeded, the API returns HTTP 429 with detailed information:

```json
{
  "success": false,
  "error": "Rate limit exceeded",
  "rateLimited": true,
  "remainingQuota": 0,
  "retryAfter": "1 hour"
}
```

## Configuration

### Environment Variables

```env
# Twilio Configuration
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_FROM_NUMBER=+1234567890

# Redis Configuration
REDIS_URL=redis://localhost:6379
REDIS_PREFIX=nftopia:sms

# Environment
NODE_ENV=production
```

### Rate Limit Configuration

Rate limits are configured in `src/config/sms.ts`:

```typescript
const rateLimits: SMSRateLimitConfig = {
  bidAlert: { limit: 5, window: 3600, bypassable: false },
  marketing: { limit: 2, window: 86400, bypassable: false },
  '2fa': { limit: -1, window: 0, bypassable: true },
  nftPurchase: { limit: -1, window: 0, bypassable: true },
};
```

## Implementation Details

### Rate Limiting Algorithm

1. **Sliding Window**: Uses Redis sorted sets with timestamps
2. **Automatic Cleanup**: Expired entries are automatically removed
3. **Distributed**: Works across multiple service instances
4. **Real-time**: Immediate rate limit checking and enforcement

### Abuse Detection

1. **Automatic Recording**: Failed attempts are recorded for non-bypassable types
2. **24-hour Retention**: Abuse records are kept for 24 hours
3. **Real-time Alerts**: Abuse attempts trigger immediate recording

### Error Handling

1. **Twilio Errors**: Proper error mapping and user-friendly messages
2. **Redis Errors**: Graceful degradation with fallback mechanisms
3. **Validation**: Comprehensive input validation with clear error messages

## Testing

Run the test suite to validate rate limiting functionality:

```bash
npm test
```

The test suite covers:
- Rate limit enforcement
- Bypassable notification types
- HTTP status codes
- Error handling
- Health checks

## Monitoring and Alerts

### Health Checks

The service provides health check endpoints to monitor:
- Redis connectivity
- Twilio API status
- Service availability

### Abuse Monitoring

Abuse attempts are automatically recorded and can be monitored via:
- `/api/v1/sms/abuse/:userId/:notificationType` endpoint
- Redis keys for manual inspection
- Log entries for failed attempts

## Security Considerations

1. **Input Validation**: All inputs are validated and sanitized
2. **Rate Limiting**: Prevents abuse and spam
3. **Error Handling**: No sensitive information in error messages
4. **Monitoring**: Real-time abuse detection and recording

## Performance

1. **Redis Optimization**: Uses sorted sets for efficient time-window queries
2. **Connection Pooling**: Redis connections are reused
3. **Caching**: Rate limit information is cached in Redis
4. **Async Operations**: Non-blocking operations for better performance

## Deployment

1. **Environment Setup**: Configure all required environment variables
2. **Redis Deployment**: Ensure Redis is available and accessible
3. **Twilio Setup**: Configure Twilio account and phone number
4. **Health Monitoring**: Set up monitoring for the health endpoints

## Troubleshooting

### Common Issues

1. **Redis Connection**: Check Redis URL and connectivity
2. **Twilio Errors**: Verify account credentials and phone number
3. **Rate Limit Issues**: Check Redis key expiration and cleanup
4. **Performance**: Monitor Redis memory usage and connection limits

### Debug Mode

Enable debug logging by setting `NODE_ENV=development` for detailed error information. 