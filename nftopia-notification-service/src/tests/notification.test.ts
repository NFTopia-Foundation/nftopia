import mongoose from 'mongoose';
import { Notification } from '../models/Notification';
import { INotificationDocument } from '../types/notification.types';

/**
 * Test Categories:
 * 1. User Notification Center Queries (userId + status)
 * 2. NFT-Specific Lookups (metadata.nftId + type)
 * 3. Time-based Sorting and Pagination (createdAt)
 * 4. Overall Performance Validation
 */

interface PerformanceMetrics {
  queryType: string;
  executionTime: number;
  documentsExamined: number;
  documentsReturned: number;
  indexUsed: boolean;
}

interface TestResults {
  before: PerformanceMetrics;
  after: PerformanceMetrics;
  improvementPercentage: number;
}

describe('Notification Performance Benchmark Tests', () => {
  const TEST_DATABASE = 'nftopia_notification_test';
  const SAMPLE_SIZE = 50000; // Increased sample size for better performance testing
  const PERFORMANCE_THRESHOLD = 70; // Required improvement percentage
  
  let testResults: TestResults[] = [];
  let testUserIds: string[] = [];
  let testNftIds: string[] = [];

  /**
   * Setup Phase: Connect to test database and prepare test data
   */
  beforeAll(async () => {
    // Connect to test database
    await mongoose.connect(`mongodb://localhost:27017/${TEST_DATABASE}`);
    
    // Generate test data identifiers with better distribution
    testUserIds = Array.from({ length: 200 }, (_, i) => `user_${i + 1}`);
    testNftIds = Array.from({ length: 1000 }, (_, i) => `nft_${i + 1}`);
    
    console.log('🔧 Setting up performance test environment...');
    
    // Drop existing collection to ensure clean state
    await Notification.collection.drop().catch(() => {});
    
    // Setup test data
    await setupTestData();
    
    // Ensure indexes are created
    await Notification.ensureIndexes();
    
    // Wait for index building to complete
    await new Promise(resolve => setTimeout(resolve, 2000));
  }, 120000); // 2 minute timeout

  /**
   * Cleanup Phase: Remove test data and close connections
   */
  afterAll(async () => {
    await Notification.deleteMany({});
    await mongoose.connection.close();
    
    console.log('📊 Performance Test Results Summary:');
    displayTestResults();
  }, 30000);

  /**
   * Test Suite 1: User Notification Center Query Performance
   * Tests the compound index: { userId: 1, status: 1 }
   */
  describe('User Notification Center Queries', () => {
    test('should show >70% improvement for userId + status queries', async () => {
      // Use a user with significant data
      const testUserId = testUserIds[0];
      const query = { userId: testUserId, status: 'pending' };
      
      // Measure performance without index (using hint to force collection scan)
      const beforeMetrics = await measureQueryPerformanceWithoutIndex(query, 'User Notification Center');
      
      // Measure performance with index
      const afterMetrics = await measureQueryPerformance(query, 'User Notification Center');
      
      const improvement = calculateImprovement(beforeMetrics, afterMetrics);
      testResults.push({
        before: beforeMetrics,
        after: afterMetrics,
        improvementPercentage: improvement
      });
      
      console.log(`📈 User Query Improvement: ${improvement.toFixed(2)}%`);
      console.log(`   Before: ${beforeMetrics.executionTime}ms (${beforeMetrics.documentsExamined} examined)`);
      console.log(`   After: ${afterMetrics.executionTime}ms (${afterMetrics.documentsExamined} examined)`);
      
      expect(afterMetrics.indexUsed).toBe(true);
      expect(improvement).toBeGreaterThan(PERFORMANCE_THRESHOLD);
    }, 30000);

    test('should efficiently handle user status filtering', async () => {
      const testUserId = testUserIds[5];
      const query = { userId: testUserId, status: { $in: ['pending', 'sent'] } };
      
      const metrics = await measureQueryPerformance(query, 'User Status Filter');
      
      // Verify index usage and performance
      expect(metrics.indexUsed).toBe(true);
      expect(metrics.executionTime).toBeLessThan(200); // More reasonable threshold
      
      // For $in queries, allow higher examination ratio but still reasonable
      if (metrics.documentsReturned > 0) {
        expect(metrics.documentsExamined).toBeLessThan(metrics.documentsReturned * 10);
      }
    }, 20000);
  });

  /**
   * Test Suite 2: NFT-Specific Query Performance
   * Tests the compound index: { "metadata.nftId": 1, type: 1 }
   */
  describe('NFT-Specific Lookup Queries', () => {
    test('should show >70% improvement for NFT metadata queries', async () => {
      const testNftId = testNftIds[0];
      const query = { 
        'metadata.nftId': testNftId, 
        type: 'push' 
      };
      
      const beforeMetrics = await measureQueryPerformanceWithoutIndex(query, 'NFT Lookup');
      const afterMetrics = await measureQueryPerformance(query, 'NFT Lookup');
      
      const improvement = calculateImprovement(beforeMetrics, afterMetrics);
      testResults.push({
        before: beforeMetrics,
        after: afterMetrics,
        improvementPercentage: improvement
      });
      
      console.log(`🎨 NFT Query Improvement: ${improvement.toFixed(2)}%`);
      expect(afterMetrics.indexUsed).toBe(true);
      expect(improvement).toBeGreaterThan(PERFORMANCE_THRESHOLD);
    }, 30000);

    test('should efficiently handle NFT type filtering', async () => {
      const testNftId = testNftIds[10];
      const query = { 
        'metadata.nftId': testNftId, 
        type: { $in: ['email', 'push'] }
      };
      
      const metrics = await measureQueryPerformance(query, 'NFT Type Filter');
      
      expect(metrics.indexUsed).toBe(true);
      expect(metrics.executionTime).toBeLessThan(100);
    }, 20000);
  });

  /**
   * Test Suite 3: Time-based Sorting Performance
   * Tests the index: { createdAt: -1 }
   */
  describe('Time-based Sorting and Pagination', () => {
    test('should show >70% improvement for chronological sorting', async () => {
      // Test recent notifications query with sorting
      const query = {};
      const sortOptions = { createdAt: -1 };
      const limit = 100;
      
      const beforeMetrics = await measureSortedQueryPerformanceWithoutIndex(query, sortOptions, limit, 'Time-based Sort');
      const afterMetrics = await measureSortedQueryPerformance(query, sortOptions, limit, 'Time-based Sort');
      
      const improvement = calculateImprovement(beforeMetrics, afterMetrics);
      testResults.push({
        before: beforeMetrics,
        after: afterMetrics,
        improvementPercentage: improvement
      });
      
      console.log(`⏰ Time Sort Improvement: ${improvement.toFixed(2)}%`);
      expect(afterMetrics.indexUsed).toBe(true);
      expect(improvement).toBeGreaterThan(PERFORMANCE_THRESHOLD);
    }, 30000);

    test('should efficiently handle pagination with time sorting', async () => {
      const pageSize = 20;
      const skip = 100;
      
      const startTime = Date.now();
      const result = await Notification.find({})
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(pageSize)
        .explain('executionStats') as any;
      
      const executionTime = Date.now() - startTime;
      
      expect(executionTime).toBeLessThan(200);
      
      // Check if index was used properly
      const indexUsed = checkIndexUsage(result);
      expect(indexUsed).toBe(true);
    }, 20000);
  });

  /**
   * Test Suite 4: Overall Performance Validation
   * Validates that all indexes meet the 70% improvement requirement
   */
  describe('Overall Performance Validation', () => {
    test('should meet 70% improvement requirement across all query patterns', async () => {
      // Calculate average improvement across all test results
      const totalImprovement = testResults.reduce((sum, result) => sum + result.improvementPercentage, 0);
      const averageImprovement = totalImprovement / testResults.length;
      
      console.log(`🎯 Average Performance Improvement: ${averageImprovement.toFixed(2)}%`);
      
      // Validate that average improvement meets requirement
      expect(averageImprovement).toBeGreaterThan(PERFORMANCE_THRESHOLD);
      
      // Ensure no individual query performs worse than baseline
      testResults.forEach(result => {
        expect(result.improvementPercentage).toBeGreaterThan(0);
      });
    }, 10000);

    test('should validate TTL index configuration', async () => {
      const indexes = await Notification.collection.indexes();
      
      // Find TTL index
      const ttlIndex = indexes.find(index => 
        index.key.createdAt === 1 && index.expireAfterSeconds
      );
      
      expect(ttlIndex).toBeTruthy();
      if (ttlIndex) {
        expect(ttlIndex.expireAfterSeconds).toBe(90 * 24 * 60 * 60); // 90 days
      }
    });

    test('should validate all required indexes exist', async () => {
      const indexes = await Notification.collection.indexes();
      
      // Check for compound index: { userId: 1, status: 1 }
      const userStatusIndex = indexes.find(index => 
        index.key.userId === 1 && index.key.status === 1
      );
      expect(userStatusIndex).toBeTruthy();
      
      // Check for time-based index: { createdAt: -1 }
      const timeIndex = indexes.find(index => 
        index.key.createdAt === -1
      );
      expect(timeIndex).toBeTruthy();
      
      // Check for NFT compound index: { "metadata.nftId": 1, type: 1 }
      const nftIndex = indexes.find(index => 
        index.key['metadata.nftId'] === 1 && index.key.type === 1
      );
      expect(nftIndex).toBeTruthy();
    });
  });

  /**
   * Helper Functions
   */

  /**
   * Sets up test data with realistic distribution
   */
  async function setupTestData(): Promise<void> {
    console.log(`📝 Generating ${SAMPLE_SIZE} test documents...`);
    
    const notifications: any[] = [];
    const types: ('email' | 'sms' | 'push' | 'in-app')[] = ['email', 'sms', 'push', 'in-app'];
    const statuses: ('pending' | 'sent' | 'failed')[] = ['pending', 'sent', 'failed'];
    
    // Create realistic data distribution
    for (let i = 0; i < SAMPLE_SIZE; i++) {
      const userId = testUserIds[i % testUserIds.length];
      const nftId = testNftIds[i % testNftIds.length];
      const type = types[i % types.length];
      const status = statuses[i % statuses.length];
      
      const notification = {
        userId,
        type,
        status,
        content: `Test notification content ${i}`,
        recipient: `recipient${i}@example.com`,
        metadata: {
          nftId,
          transactionHash: `0x${i.toString(16).padStart(64, '0')}`,
          priority: i % 3 + 1,
          eventType: `event_${i % 10}`,
          blockNumber: Math.floor(i / 100) + 1000000
        },
        createdAt: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000), // Random date within 90 days
        updatedAt: new Date()
      };
      
      notifications.push(notification);
    }
    
    // Insert in batches for better performance
    const batchSize = 1000;
    for (let i = 0; i < notifications.length; i += batchSize) {
      const batch = notifications.slice(i, i + batchSize);
      await Notification.insertMany(batch);
      
      // Progress indicator
      if ((i + batchSize) % 10000 === 0) {
        console.log(`📝 Inserted ${i + batchSize}/${SAMPLE_SIZE} documents...`);
      }
    }
    
    console.log(`✅ Test data setup complete`);
  }

  /**
   * Measures query performance and returns metrics
   */
  async function measureQueryPerformance(query: any, queryType: string): Promise<PerformanceMetrics> {
    // Warm up the query
    await Notification.find(query).limit(1);
    
    const startTime = process.hrtime.bigint();
    const result = await Notification.find(query).explain('executionStats') as any;
    const endTime = process.hrtime.bigint();
    
    const executionTime = Number(endTime - startTime) / 1000000; // Convert to milliseconds
    
    const stats = result.executionStats || result;
    const indexUsed = checkIndexUsage(result);
    
    return {
      queryType,
      executionTime,
      documentsExamined: stats.totalDocsExamined || 0,
      documentsReturned: stats.totalDocsReturned || 0,
      indexUsed
    };
  }

  /**
   * Measures query performance without using indexes (for comparison)
   */
  async function measureQueryPerformanceWithoutIndex(query: any, queryType: string): Promise<PerformanceMetrics> {
    // Warm up
    await Notification.find(query).hint({ $natural: 1 }).limit(1);
    
    const startTime = process.hrtime.bigint();
    const result = await Notification.find(query).hint({ $natural: 1 }).explain('executionStats') as any;
    const endTime = process.hrtime.bigint();
    
    const executionTime = Number(endTime - startTime) / 1000000; // Convert to milliseconds
    
    const stats = result.executionStats || result;
    
    return {
      queryType,
      executionTime,
      documentsExamined: stats.totalDocsExamined || 0,
      documentsReturned: stats.totalDocsReturned || 0,
      indexUsed: false // Forced collection scan
    };
  }

  /**
   * Measures sorted query performance
   */
  async function measureSortedQueryPerformance(
    query: any, 
    sort: any, 
    limit: number, 
    queryType: string
  ): Promise<PerformanceMetrics> {
    // Warm up
    await Notification.find(query).sort(sort).limit(1);
    
    const startTime = process.hrtime.bigint();
    const result = await Notification.find(query)
      .sort(sort)
      .limit(limit)
      .explain('executionStats') as any;
    const endTime = process.hrtime.bigint();
    
    const executionTime = Number(endTime - startTime) / 1000000;
    const stats = result.executionStats || result;
    const indexUsed = checkIndexUsage(result);
    
    return {
      queryType,
      executionTime,
      documentsExamined: stats.totalDocsExamined || 0,
      documentsReturned: stats.totalDocsReturned || 0,
      indexUsed
    };
  }

  /**
   * Measures sorted query performance without using indexes
   */
  async function measureSortedQueryPerformanceWithoutIndex(
    query: any, 
    sort: any, 
    limit: number, 
    queryType: string
  ): Promise<PerformanceMetrics> {
    // Warm up
    await Notification.find(query).sort(sort).limit(1).hint({ $natural: 1 });
    
    const startTime = process.hrtime.bigint();
    const result = await Notification.find(query)
      .sort(sort)
      .limit(limit)
      .hint({ $natural: 1 })
      .explain('executionStats') as any;
    const endTime = process.hrtime.bigint();
    
    const executionTime = Number(endTime - startTime) / 1000000;
    const stats = result.executionStats || result;
    
    return {
      queryType,
      executionTime,
      documentsExamined: stats.totalDocsExamined || 0,
      documentsReturned: stats.totalDocsReturned || 0,
      indexUsed: false
    };
  }

  /**
   * Checks if an index was used in the query execution
   */
  function checkIndexUsage(explainResult: any): boolean {
    const stats = explainResult.executionStats || explainResult;
    
    // Check different possible locations for index usage information
    if (stats.executionStages) {
      return checkStageForIndex(stats.executionStages);
    }
    
    if (stats.winningPlan) {
      return checkStageForIndex(stats.winningPlan);
    }
    
    // Check if stage is IXSCAN (index scan)
    if (stats.stage === 'IXSCAN') {
      return true;
    }
    
    return false;
  }

  /**
   * Recursively checks execution stages for index usage
   */
  function checkStageForIndex(stage: any): boolean {
    if (!stage) return false;
    
    // Check if current stage is an index scan
    if (stage.stage === 'IXSCAN') {
      return true;
    }
    
    // Check input stage
    if (stage.inputStage) {
      return checkStageForIndex(stage.inputStage);
    }
    
    // Check input stages array
    if (stage.inputStages && Array.isArray(stage.inputStages)) {
      return stage.inputStages.some((inputStage: any) => checkStageForIndex(inputStage));
    }
    
    return false;
  }

  /**
   * Calculates performance improvement percentage
   */
  function calculateImprovement(before: PerformanceMetrics, after: PerformanceMetrics): number {
    if (before.executionTime === 0) return 0;
    return ((before.executionTime - after.executionTime) / before.executionTime) * 100;
  }

  /**
   * Displays comprehensive test results
   */
  function displayTestResults(): void {
    console.log('\n' + '='.repeat(80));
    console.log('📊 PERFORMANCE BENCHMARK RESULTS');
    console.log('='.repeat(80));
    
    testResults.forEach((result, index) => {
      console.log(`\n${index + 1}. ${result.before.queryType}`);
      console.log(`   Before: ${result.before.executionTime.toFixed(2)}ms (${result.before.documentsExamined} docs examined)`);
      console.log(`   After:  ${result.after.executionTime.toFixed(2)}ms (${result.after.documentsExamined} docs examined)`);
      console.log(`   Improvement: ${result.improvementPercentage.toFixed(2)}%`);
      console.log(`   Index Used: ${result.after.indexUsed ? '✅' : '❌'}`);
    });
    
    if (testResults.length > 0) {
      const avgImprovement = testResults.reduce((sum, r) => sum + r.improvementPercentage, 0) / testResults.length;
      console.log(`\n🎯 Average Improvement: ${avgImprovement.toFixed(2)}%`);
      console.log(`📋 Target Met: ${avgImprovement > PERFORMANCE_THRESHOLD ? '✅' : '❌'} (${PERFORMANCE_THRESHOLD}% required)`);
    }
    console.log('='.repeat(80));
  }
});
