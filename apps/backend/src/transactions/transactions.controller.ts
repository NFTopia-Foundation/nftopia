// transactions.controller.ts
import { Controller, Post, Get, Body, Req, UseGuards } from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { RequestWithUser } from '../types/RequestWithUser';
import { TransactionContext } from '../fraud-detection/dto/fraud-check-result.dto';

@Controller('transactions')
export class TransactionsController {
  constructor(private readonly txService: TransactionsService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  async record(
    @Body() body: { nftId: string; price: number },
    @Req() req: RequestWithUser,
  ) {
    const buyerId = req.user.sub;
    
    // Extract device/context information
    const context: TransactionContext = {
      deviceInfo: {
        userAgent: req.headers['user-agent'] || 'unknown',
        ipAddress: req.ip || req.connection.remoteAddress || 'unknown'
      }
      // Add geo-location if available
    };
    
    const tx = await this.txService.recordTransaction(buyerId, body.nftId, body.price, context);
    return { message: 'Transaction recorded', tx };
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  async getUserTransactions(@Req() req: RequestWithUser) {
    const userId = req.user.sub;
    const transactions = await this.txService.getTransactionsByUser(userId);
    return { transactions };
  }
}
