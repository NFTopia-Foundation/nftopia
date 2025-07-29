# Transaction Webhook for On-Chain Events

This document describes the implementation of the Transaction Webhook for On-Chain Events in the NFTopia Payment Service.

## Overview

The webhook endpoint receives and processes on-chain transaction events from Starknet, updating transaction statuses asynchronously with proper security, rate limiting, and monitoring.

## Endpoint

- **URL**: `POST /api/transactions/webhook`
- **Headers**: 
  - `X-Starknet-Signature`: HMAC-SHA256 signature for request verification
  - `Content-Type`: `application/json`

## Event Payload Structure

```json
{
  "txHash": "0x1234567890abcdef",
  "status": "COMPLETED",
  "blockTimestamp": "2024-01-01T12:00:00Z",
  "blockNumber": 12345,
  "logs": [
    {
      "contractAddress": "0xcontract",
      "eventType": "Transfer",
      "data": {
        "from": "0x123",
        "to": "0x456",
        "value": "1000000000000000000"
      }
    }
  ]
}
```

## Security Features

### 1. Signature Verification
- HMAC-SHA256 signature validation
- Shared secret stored in environment variable `WEBHOOK_SECRET_KEY`
- Invalid signatures return 401 Unauthorized

### 2. Rate Limiting
- 100 requests/minute per IP address
- Configurable via `webhook.rate.limit.requests` and `webhook.rate.limit.duration`
- Exceeded limits return 429 Too Many Requests

### 3. Idempotency
- Deduplication by `txHash + blockNumber`
- Prevents duplicate processing of the same event

## Async Processing

- Events are processed asynchronously using Spring's `@Async`
- Retry mechanism with exponential backoff (3 attempts)
- Processing time target: < 500ms (99th percentile)

## Monitoring

### Metrics
- `webhook.processing.time`: Processing time histogram
- `webhook.processed`: Successful event processing counter
- `webhook.failed`: Failed event processing counter
- `webhook.rate.limited`: Rate limit exceeded counter
- `webhook.invalid.signature`: Invalid signature counter

### Endpoints
- `/actuator/health`: Health check
- `/actuator/metrics`: Metrics endpoint
- `/actuator/prometheus`: Prometheus metrics

## Configuration

### Environment Variables
```bash
WEBHOOK_SECRET_KEY=your-secret-key-here
NOTIFICATION_SERVICE_URL=http://localhost:9004
```

### Application Properties
```properties
# Webhook Configuration
webhook.secret.key=${WEBHOOK_SECRET_KEY:your-secret-key-here}
webhook.rate.limit.requests=100
webhook.rate.limit.duration=60

# Notification Service Configuration
notification.service.url=${NOTIFICATION_SERVICE_URL:http://localhost:9004}

# Monitoring Configuration
management.endpoints.web.exposure.include=health,info,metrics,prometheus
management.endpoint.health.show-details=always
management.metrics.export.prometheus.enabled=true

# Async Configuration
spring.task.execution.pool.core-size=5
spring.task.execution.pool.max-size=20
spring.task.execution.pool.queue-capacity=100
```

## Integration Points

### 1. Transaction Status Updates
- Updates transaction status based on on-chain events
- Maps Starknet transaction status to internal status

### 2. Notification Service
- Sends notifications to users about transaction status changes
- Uses WebClient for async HTTP calls

### 3. Monitoring Integration
- Micrometer metrics for monitoring
- Prometheus endpoint for metrics collection
- Health checks for service monitoring

## Error Handling

### HTTP Status Codes
- `202 Accepted`: Event accepted for processing
- `401 Unauthorized`: Invalid signature
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Processing error

### Retry Logic
- 3 retry attempts with exponential backoff
- 1s, 2s, 4s delays between retries
- Failed events are logged and monitored

## Testing

Run the webhook tests:
```bash
./gradlew test --tests TransactionWebhookControllerTest
```

## Dependencies

- Spring Boot WebFlux (async processing)
- Bucket4j (rate limiting)
- Micrometer (monitoring)
- Jackson (JSON processing)
- Spring Retry (retry mechanism)

## Security Considerations

1. **Secret Management**: Store webhook secret in environment variables or Vault
2. **Rate Limiting**: Prevents abuse and ensures service stability
3. **Signature Verification**: Ensures request authenticity
4. **Idempotency**: Prevents duplicate processing
5. **Async Processing**: Prevents blocking of webhook endpoint

## Performance Considerations

1. **Async Processing**: Non-blocking webhook responses
2. **Connection Pooling**: WebClient with connection pooling
3. **Rate Limiting**: Prevents service overload
4. **Monitoring**: Real-time performance tracking
5. **Retry Logic**: Handles temporary failures gracefully 