# NFTopia Notification Schema

## Overview

This document describes the foundational Mongoose schema for notifications in the NFTopia Express.js microservice. The schema standardizes how we store and track all notification events across the NFT platform.

## 🎯 Implementation Status

✅ **COMPLETED** - All acceptance criteria met and ready for production use.

## 📋 Schema Structure

### Required Fields
- `userId` (String): Recipient reference - required, indexed, validated
- `type` (Enum): Notification type - required, indexed
  - Values: `['mint', 'bid', 'sale', 'auction', 'admin']`
- `content` (String): Localized template - required, 1-1000 characters, trimmed
- `channels` (Array): Multi-channel support - required, at least one
  - Values: `['email', 'sms', 'push', 'in-app']`

### Optional Fields
- `status` (Enum): Notification status - default 'pending', indexed
  - Values: `['pending', 'sent', 'failed', 'read']`
- `metadata` (Object): NFT context
  - `nftId` (String): Optional NFT identifier
  - `collection` (String): Optional collection name
  - `txHash` (String): Optional transaction hash (validated hex format)
- `readAt` (Date): When notification was read
- `sentAt` (Date): When notification was sent
- `failedAt` (Date): When notification failed
- `retryCount` (Number): Current retry attempts - default 0
- `maxRetries` (Number): Maximum retry attempts - default 3

### Automatic Fields
- `createdAt` (Date): Auto-generated timestamp
- `updatedAt` (Date): Auto-updated timestamp

## 🔧 Features

### TypeScript Support
- Full TypeScript interfaces for type safety
- `INotification` interface extends Document
- `INotificationMetadata` interface for metadata
- `INotificationModel` interface for static methods

### Validation Rules
- **userId**: Required, non-empty string
- **type**: Required, must be one of enum values
- **content**: Required, 1-1000 characters
- **channels**: Required, at least one valid channel
- **txHash**: Optional, must be valid hex format (0x + 64 characters)
- **metadata**: If nftId provided, collection is required
- **retryCount**: Must be non-negative
- **maxRetries**: Must be between 1-10

### Database Indexes
- `userId_1` (single field)
- `type_1` (single field)
- `status_1` (single field)
- `userId_1_status_1` (compound)
- `userId_1_type_1` (compound)
- `userId_1_createdAt_-1` (compound)
- `status_1_createdAt_1` (compound)
- `type_1_status_1` (compound)
- `metadata.nftId_1_type_1` (compound)
- `content_text` (text search)

### Instance Methods
- `markAsRead()`: Mark notification as read
- `markAsSent()`: Mark notification as sent
- `markAsFailed()`: Mark notification as failed and increment retry count
- `canRetry()`: Check if notification can be retried

### Static Methods
- `findByUser(userId, limit?, skip?)`: Find notifications by user
- `findPending()`: Find all pending notifications
- `findByType(type, limit?)`: Find notifications by type
- `findByNFT(nftId)`: Find notifications by NFT ID

### Middleware
- **Pre-save**: Custom validation for channels and metadata
- **Post-save**: Logging for debugging and monitoring

## 🚀 Usage Examples

### Creating a Notification
```typescript
import Notification from './models/Notification';

const notification = new Notification({
  userId: 'user123',
  type: 'mint',
  content: 'Your NFT has been minted successfully!',
  channels: ['email', 'push'],
  metadata: {
    nftId: 'nft123',
    collection: 'Cool Collection',
    txHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
  }
});

await notification.save();
```

### Using Instance Methods
```typescript
// Mark as read
await notification.markAsRead();

// Mark as sent
await notification.markAsSent();

// Mark as failed
await notification.markAsFailed();

// Check if can retry
if (notification.canRetry()) {
  // Retry logic
}
```

### Using Static Methods
```typescript
// Find user notifications
const userNotifications = await Notification.findByUser('user123', 50, 0);

// Find pending notifications
const pendingNotifications = await Notification.findPending();

// Find by type
const mintNotifications = await Notification.findByType('mint', 10);

// Find by NFT
const nftNotifications = await Notification.findByNFT('nft123');
```

## 🧪 Testing

### Running Tests
```bash
# Run all tests
npm test

# Run specific test file
npm test -- src/tests/Notification.structure.test.ts

# Run with coverage
npm run test:coverage
```

### Test Coverage
- ✅ Required fields validation
- ✅ Enum validation
- ✅ Content validation
- ✅ Metadata validation
- ✅ Instance methods
- ✅ Static methods
- ✅ Timestamps
- ✅ Indexes

## 📁 File Structure

```
src/
├── models/
│   └── Notification.ts          # Main schema implementation
├── config/
│   ├── database.ts              # Database connection setup
│   └── env.ts                   # Environment configuration
├── tests/
│   ├── Notification.test.ts     # Full integration tests
│   ├── Notification.schema.test.ts  # Schema validation tests
│   └── Notification.structure.test.ts  # Structure tests
└── app.ts                       # Express app with database integration
```

## 🔧 Configuration

### Environment Variables
```bash
# Database
MONGO_URI=mongodb://localhost:27017/nftopia-notifications
MONGO_DB_NAME=nftopia-notifications

# Test Database
MONGO_TEST_URI=mongodb://localhost:27017/nftopia-notifications-test
```

### Database Connection
The service includes:
- Automatic retry logic with exponential backoff
- Graceful shutdown handling
- Health check endpoints
- Connection pooling

## 🎯 Acceptance Criteria Status

| Criteria | Status | Details |
|----------|--------|---------|
| Schema created in `src/models/Notification.ts` | ✅ | Complete |
| All required fields implemented | ✅ | Complete |
| Proper typing | ✅ | TypeScript interfaces |
| Indexes for common query patterns | ✅ | 10 indexes created |
| Custom validation logic | ✅ | Comprehensive validation |
| Basic unit tests | ✅ | Full test suite |

## 🚀 Next Steps

The notification schema is production-ready and can be used immediately. Future enhancements could include:

1. **API Endpoints**: Create REST endpoints for CRUD operations
2. **Notification Templates**: Implement template system for dynamic content
3. **Rate Limiting**: Add rate limiting for notification creation
4. **Webhooks**: Add webhook support for external integrations
5. **Analytics**: Add notification analytics and reporting

## 📊 Performance Considerations

- **Indexes**: Optimized for common query patterns
- **Validation**: Efficient validation functions
- **Connection Pooling**: Configured for optimal performance
- **Text Search**: Full-text search capability for content

## 🔒 Security

- **Input Validation**: All inputs are validated
- **SQL Injection**: Protected by Mongoose ODM
- **Data Sanitization**: Automatic trimming and validation
- **Access Control**: Ready for authentication middleware

---

**Implementation completed successfully!** 🎉

The notification schema is ready for production use in the NFTopia platform. 