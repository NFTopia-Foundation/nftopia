// transactions.controller.ts
import { Controller, Post, Get, Body, Req, UseGuards } from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { RequestWithUser } from '../types/RequestWithUser';

@Controller('transactions')
export class TransactionsController {
  
}
