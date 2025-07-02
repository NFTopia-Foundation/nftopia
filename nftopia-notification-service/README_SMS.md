# SMS Rate Limiting Implementation

## Overview
SMS rate limiting for NFTopia notification service with Redis-backed counters and abuse detection.

## Rate Limits
- **Bid Alerts**: 5 per hour
- **Marketing**: 2 per 24 hours  
- **2FA Codes**: Unlimited (bypassable)
- **NFT Purchase**: Unlimited (bypassable)

## API Endpoints

### Send SMS
- `POST /api/v1/sms/bid-alert` - Bid notifications
- `POST /api/v1/sms/marketing` - Marketing messages
- `POST /api/v1/sms/2fa` - 2FA codes
- `POST /api/v1/sms/nft-purchase` - Purchase confirmations

### Rate Limiting
- `GET /api/v1/sms/rate-limit/:userId/:type` - Get quota info
- `GET /api/v1/sms/abuse/:userId/:type` - Get abuse attempts
- `GET /api/v1/sms/health` - Health check

## Environment Variables
```env
TWILIO_ACCOUNT_SID=your_sid
TWILIO_AUTH_TOKEN=your_token
TWILIO_FROM_NUMBER=+1234567890
REDIS_URL=redis://localhost:6379
REDIS_PREFIX=nftopia:sms
```

## Rate Limit Response (429)
```json
{
  "success": false,
  "error": "Rate limit exceeded",
  "rateLimited": true,
  "remainingQuota": 0,
  "retryAfter": "1 hour"
}
```

## Testing
```bash
npm test
``` 