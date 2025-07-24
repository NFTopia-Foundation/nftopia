import { Injectable, Logger } from '@nestjs/common';

interface WebhookMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageProcessingTime: number;
  lastProcessingTime: number;
  retryCount: number;
  eventBacklog: number;
}

@Injectable()
export class WebhookMetricsService {
  private readonly logger = new Logger(WebhookMetricsService.name);
  private metrics: WebhookMetrics = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    averageProcessingTime: 0,
    lastProcessingTime: 0,
    retryCount: 0,
    eventBacklog: 0,
  };

  private processingTimes: number[] = [];
  private readonly maxProcessingTimeHistory = 100; // Keep last 100 processing times

  /**
   * Record a successful webhook request
   */
  recordSuccess(processingTime: number): void {
    this.metrics.totalRequests++;
    this.metrics.successfulRequests++;
    this.recordProcessingTime(processingTime);
    
    this.logger.log(`Webhook success recorded. Processing time: ${processingTime}ms`);
  }

  /**
   * Record a failed webhook request
   */
  recordFailure(processingTime: number): void {
    this.metrics.totalRequests++;
    this.metrics.failedRequests++;
    this.recordProcessingTime(processingTime);
    
    this.logger.warn(`Webhook failure recorded. Processing time: ${processingTime}ms`);
  }

  /**
   * Record a retry attempt
   */
  recordRetry(): void {
    this.metrics.retryCount++;
    this.logger.log(`Webhook retry recorded. Total retries: ${this.metrics.retryCount}`);
  }

  /**
   * Update event backlog count
   */
  updateEventBacklog(count: number): void {
    this.metrics.eventBacklog = count;
  }

  /**
   * Get current metrics
   */
  getMetrics(): WebhookMetrics {
    return { ...this.metrics };
  }

  /**
   * Get success rate as percentage
   */
  getSuccessRate(): number {
    if (this.metrics.totalRequests === 0) return 100;
    return (this.metrics.successfulRequests / this.metrics.totalRequests) * 100;
  }

  /**
   * Get 99th percentile processing time
   */
  get99thPercentileProcessingTime(): number {
    if (this.processingTimes.length === 0) return 0;
    
    const sorted = [...this.processingTimes].sort((a, b) => a - b);
    const index = Math.ceil(sorted.length * 0.99) - 1;
    return sorted[index] || 0;
  }

  /**
   * Check if performance is within acceptable limits
   */
  isPerformanceAcceptable(): boolean {
    const p99 = this.get99thPercentileProcessingTime();
    const successRate = this.getSuccessRate();
    
    // Performance criteria: 99th percentile < 500ms and success rate > 95%
    return p99 < 500 && successRate > 95;
  }

  /**
   * Reset metrics (useful for testing or periodic resets)
   */
  resetMetrics(): void {
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageProcessingTime: 0,
      lastProcessingTime: 0,
      retryCount: 0,
      eventBacklog: 0,
    };
    this.processingTimes = [];
    
    this.logger.log('Webhook metrics reset');
  }

  /**
   * Log current metrics summary
   */
  logMetricsSummary(): void {
    const successRate = this.getSuccessRate();
    const p99 = this.get99thPercentileProcessingTime();
    
    this.logger.log(`
      Webhook Metrics Summary:
      - Total Requests: ${this.metrics.totalRequests}
      - Success Rate: ${successRate.toFixed(2)}%
      - Average Processing Time: ${this.metrics.averageProcessingTime.toFixed(2)}ms
      - 99th Percentile: ${p99.toFixed(2)}ms
      - Retry Count: ${this.metrics.retryCount}
      - Event Backlog: ${this.metrics.eventBacklog}
      - Performance Acceptable: ${this.isPerformanceAcceptable()}
    `);
  }

  private recordProcessingTime(processingTime: number): void {
    this.metrics.lastProcessingTime = processingTime;
    this.processingTimes.push(processingTime);
    
    // Keep only the last N processing times
    if (this.processingTimes.length > this.maxProcessingTimeHistory) {
      this.processingTimes.shift();
    }
    
    // Update average
    this.metrics.averageProcessingTime = 
      this.processingTimes.reduce((sum, time) => sum + time, 0) / this.processingTimes.length;
  }
}
