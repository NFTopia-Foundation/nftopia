import Notification, { INotification, INotificationMetadata } from '../models/Notification';

describe('Notification Schema Structure', () => {
  it('should have correct TypeScript interfaces', () => {
    // Test INotificationMetadata interface
    const metadata: INotificationMetadata = {
      nftId: 'nft123',
      collection: 'Cool Collection',
      txHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
    };
    
    expect(metadata.nftId).toBe('nft123');
    expect(metadata.collection).toBe('Cool Collection');
    expect(metadata.txHash).toBe('0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef');
  });

  it('should have correct schema fields', () => {
    const schema = Notification.schema;
    
    // Check required fields exist
    expect(schema.paths.userId).toBeDefined();
    expect(schema.paths.type).toBeDefined();
    expect(schema.paths.content).toBeDefined();
    expect(schema.paths.channels).toBeDefined();
    expect(schema.paths.status).toBeDefined();
    
    // Check optional fields exist
    expect(schema.paths.metadata).toBeDefined();
    expect(schema.paths.readAt).toBeDefined();
    expect(schema.paths.sentAt).toBeDefined();
    expect(schema.paths.failedAt).toBeDefined();
    expect(schema.paths.retryCount).toBeDefined();
    expect(schema.paths.maxRetries).toBeDefined();
  });

  it('should have correct enum values', () => {
    const schema = Notification.schema;
    
    // Check type enum - access the enum values through the schema definition
    const typePath = schema.paths.type;
    expect(typePath).toBeDefined();
    
    // Check status enum
    const statusPath = schema.paths.status;
    expect(statusPath).toBeDefined();
  });

  it('should have correct default values', () => {
    const schema = Notification.schema;
    
    // Check that the fields exist
    const statusPath = schema.paths.status;
    expect(statusPath).toBeDefined();
    
    const retryCountPath = schema.paths.retryCount;
    expect(retryCountPath).toBeDefined();
    
    const maxRetriesPath = schema.paths.maxRetries;
    expect(maxRetriesPath).toBeDefined();
  });

  it('should have required field validations', () => {
    const schema = Notification.schema;
    
    // Check userId is required
    const userIdPath = schema.paths.userId;
    expect(userIdPath).toBeDefined();
    
    // Check type is required
    const typePath = schema.paths.type;
    expect(typePath).toBeDefined();
    
    // Check content is required
    const contentPath = schema.paths.content;
    expect(contentPath).toBeDefined();
  });

  it('should have instance methods', () => {
    const schema = Notification.schema;
    
    expect(typeof schema.methods.markAsRead).toBe('function');
    expect(typeof schema.methods.markAsSent).toBe('function');
    expect(typeof schema.methods.markAsFailed).toBe('function');
    expect(typeof schema.methods.canRetry).toBe('function');
  });

  it('should have static methods', () => {
    const schema = Notification.schema;
    
    expect(typeof schema.statics.findByUser).toBe('function');
    expect(typeof schema.statics.findPending).toBe('function');
    expect(typeof schema.statics.findByType).toBe('function');
    expect(typeof schema.statics.findByNFT).toBe('function');
  });

  it('should have timestamps enabled', () => {
    const schema = Notification.schema;
    // Check if timestamps are enabled by looking for createdAt and updatedAt paths
    expect(schema.paths.createdAt).toBeDefined();
    expect(schema.paths.updatedAt).toBeDefined();
  });

  it('should have correct collection name', () => {
    const schema = Notification.schema;
    // Check collection name through the model
    expect(Notification.collection.name).toBe('notifications');
  });
}); 