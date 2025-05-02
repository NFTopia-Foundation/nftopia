import { Controller, Post, Get, Body, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TransactionsService } from './transactions.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';

@Controller('transactions')
@UseGuards(JwtAuthGuard)
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Post()
  async createTransaction(@Request() req, @Body() createTransactionDto: CreateTransactionDto) {
    const { nft, amount, transactionHash } = createTransactionDto;
    return this.transactionsService.createTransaction(
      req.user,
      nft.owner,
      nft,
      amount,
      transactionHash,
    );
  }

  @Get()
  async getUserTransactions(@Request() req) {
    return this.transactionsService.getUserTransactions(req.user.id);
  }
}
