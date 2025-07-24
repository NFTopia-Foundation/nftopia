import { Controller, Get, UseGuards } from '@nestjs/common';
import { WebhookMetricsService } from '../services/webhook-metrics.service';
import { JwtAuthGuard } from '../../auth/jwt.guard';

@Controller('api/transactions/webhook/metrics')
@UseGuards(JwtAuthGuard) // Protect metrics endpoint
export class WebhookMetricsController {
  constructor(private readonly metricsService: WebhookMetricsService) {}

  @Get()
  getMetrics() {
    const metrics = this.metricsService.getMetrics();
    const successRate = this.metricsService.getSuccessRate();
    const p99ProcessingTime = this.metricsService.get99thPercentileProcessingTime();
    const isPerformanceAcceptable = this.metricsService.isPerformanceAcceptable();

    return {
      ...metrics,
      successRate: parseFloat(successRate.toFixed(2)),
      p99ProcessingTime: parseFloat(p99ProcessingTime.toFixed(2)),
      isPerformanceAcceptable,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('health')
  getHealthStatus() {
    const isHealthy = this.metricsService.isPerformanceAcceptable();
    const metrics = this.metricsService.getMetrics();
    
    return {
      status: isHealthy ? 'healthy' : 'degraded',
      checks: {
        processingTime: {
          status: this.metricsService.get99thPercentileProcessingTime() < 500 ? 'pass' : 'fail',
          value: this.metricsService.get99thPercentileProcessingTime(),
          threshold: 500,
          unit: 'ms'
        },
        successRate: {
          status: this.metricsService.getSuccessRate() > 95 ? 'pass' : 'fail',
          value: this.metricsService.getSuccessRate(),
          threshold: 95,
          unit: '%'
        },
        eventBacklog: {
          status: metrics.eventBacklog < 100 ? 'pass' : 'warn',
          value: metrics.eventBacklog,
          threshold: 100,
          unit: 'events'
        }
      },
      timestamp: new Date().toISOString(),
    };
  }
}
