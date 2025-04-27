import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CsrfGuard } from '../auth/guards/csrf.guard';
import { Request } from 'express';
 import { RequestWithUser } from './interfaces/user.interface';

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @UseGuards(JwtAuthGuard, CsrfGuard)
  @Get('me')
  async getProfile(@Req() req: RequestWithUser) {
    const user = await this.usersService.findById(req.user.id);
    
    // Return user without sensitive information
    return {
      id: user.id,
      address: user.address,
      createdAt: user.createdAt,
      lastLogin: user.lastLogin,
    };
  }
}