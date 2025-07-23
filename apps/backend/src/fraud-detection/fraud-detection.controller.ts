import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { FraudCheckService } from './services/fraud-check.service';

@Controller('fraud-detection')
@UseGuards(JwtAuthGuard)
export class FraudDetectionController {
  constructor(private readonly fraudCheckService: FraudCheckService) {}

  @Get('metrics')
  async getFraudMetrics() {
    const metrics = await this.fraudCheckService.getFraudMetrics();
    return { success: true, data: metrics };
  }

  @Get('transaction/:id/check')
  async getTransactionFraudCheck(@Param('id') transactionId: string) {
    // Implementation to get fraud check for specific transaction
    return { success: true, message: 'Fraud check retrieved' };
  }
}