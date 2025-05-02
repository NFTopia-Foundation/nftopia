import { Controller, Post, Get, Body, Param, Put, UseGuards } from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { User } from '../auth/decorators/user.decorator';

@Controller('transactions')
@UseGuards(JwtAuthGuard)
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Post()
  async createTransaction(
    @Body() createTransactionDto: CreateTransactionDto,
    @User('id') userId: string,
  ) {
    return this.transactionsService.createTransaction(createTransactionDto);
  }

  @Get()
  async getUserTransactions(@User('id') userId: string) {
    return this.transactionsService.getUserTransactions(userId);
  }

  @Put(':id/status')
  async updateTransactionStatus(
    @Param('id') id: string,
    @Body('status') status: 'completed' | 'failed',
    @Body('transactionHash') transactionHash?: string,
  ) {
    return this.transactionsService.updateTransactionStatus(id, status, transactionHash);
  }
}
