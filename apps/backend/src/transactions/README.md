# Starknet Transaction Webhook Implementation

This module implements a secure webhook endpoint for receiving and processing on-chain transaction events from Starknet.

## Features

### Security
- **HMAC-SHA256 Signature Verification**: All webhook requests are verified using a shared secret
- **Rate Limiting**: 100 requests per minute per IP address
- **Input Validation**: Comprehensive validation of webhook payloads
- **Timing-Safe Comparison**: Prevents timing attacks during signature verification

### Performance
- **Async Processing**: Events are processed asynchronously with immediate response
- **Retry Mechanism**: Failed events are retried up to 3 times with exponential backoff
- **Idempotency**: Duplicate events are detected and ignored using txHash + blockNumber
- **Performance Monitoring**: 99th percentile processing time tracking

### Monitoring
- **Metrics Collection**: Success rate, processing times, retry counts, and backlog monitoring
- **Health Checks**: Automated performance validation
- **Logging**: Comprehensive logging for debugging and monitoring

## API Endpoints

### Webhook Endpoint
```
POST /api/transactions/webhook
```

**Headers:**
- `X-Starknet-Signature`: HMAC-SHA256 signature of the request body
- `Content-Type`: application/json

**Request Body:**
```json
{
  "txHash": "0x123456789abcdef",
  "status": "completed",
  "blockTimestamp": "2024-01-01T00:00:00Z",
  "blockNumber": 12345,
  "logs": [
    {
      "contractAddress": "0xabc123",
      "eventType": "Transfer",
      "data": {
        "from": "0x123",
        "to": "0x456",
        "tokenId": "789"
      }
    }
  ]
}
```

**Response:**
- `202 Accepted`: Event received and queued for processing
- `401 Unauthorized`: Invalid or missing signature
- `429 Too Many Requests`: Rate limit exceeded

### Metrics Endpoint
```
GET /api/transactions/webhook/metrics
```

**Authentication:** JWT required

**Response:**
```json
{
  "totalRequests": 1000,
  "successfulRequests": 995,
  "failedRequests": 5,
  "successRate": 99.5,
  "averageProcessingTime": 150.5,
  "p99ProcessingTime": 450.2,
  "retryCount": 12,
  "eventBacklog": 0,
  "isPerformanceAcceptable": true,
  "timestamp": "2024-01-01T00:00:00Z"
}
```

### Health Check Endpoint
```
GET /api/transactions/webhook/metrics/health
```

**Authentication:** JWT required

**Response:**
```json
{
  "status": "healthy",
  "checks": {
    "processingTime": {
      "status": "pass",
      "value": 450.2,
      "threshold": 500,
      "unit": "ms"
    },
    "successRate": {
      "status": "pass",
      "value": 99.5,
      "threshold": 95,
      "unit": "%"
    },
    "eventBacklog": {
      "status": "pass",
      "value": 0,
      "threshold": 100,
      "unit": "events"
    }
  },
  "timestamp": "2024-01-01T00:00:00Z"
}
```

## Configuration

### Environment Variables
```bash
# Webhook secret for signature verification
STARKNET_WEBHOOK_SECRET=your-webhook-secret-key-here

# Request timeout in milliseconds
REQUEST_TIMEOUT=15000

# JWT secret for metrics endpoint authentication
JWT_SECRET=your-jwt-secret-here
```

## Transaction Status Flow

1. **pending**: Initial transaction state
2. **completed**: Transaction successfully executed on-chain
3. **confirmed**: Transaction confirmed with sufficient block confirmations
4. **failed**: Transaction failed during execution
5. **reverted**: Transaction was reverted due to contract logic

## Event Processing

1. **Signature Verification**: Validate HMAC-SHA256 signature
2. **Rate Limiting**: Check request rate limits
3. **Idempotency Check**: Prevent duplicate processing
4. **Async Processing**: Queue event for background processing
5. **Database Update**: Update transaction status
6. **Event Log Processing**: Process contract event logs
7. **Notification**: Trigger external notifications
8. **Retry Logic**: Retry failed processing with exponential backoff

## Performance Requirements

- **Response Time**: 99th percentile < 500ms
- **Success Rate**: > 95%
- **Retry Attempts**: Maximum 3 attempts
- **Rate Limit**: 100 requests/minute per IP

## Testing

Run the webhook tests:
```bash
npm test -- transaction-webhook.controller.spec.ts
```

## Monitoring

The webhook provides comprehensive monitoring through:
- Processing time metrics (average and 99th percentile)
- Success/failure rates
- Retry attempt tracking
- Event backlog monitoring
- Health status checks

Monitor the `/api/transactions/webhook/metrics/health` endpoint for automated health checks.
