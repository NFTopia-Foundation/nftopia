import {
    Controller,
    Post,
    Body,
    Res,
    HttpStatus,
    UseGuards,
    Req,
    Get,
    BadRequestException,
  } from '@nestjs/common';
  import { Response, Request } from 'express';
  import { AuthService } from './auth.service';
  import { NonceRequestDto, WalletLoginDto } from './dtos/wallet-login.dto';
  import { JwtAuthGuard } from './guards/jwt-auth.guard';
  import { RefreshTokenGuard } from './guards/refresh-token.guard';
  import { CsrfGuard } from './guards/csrf.guard';
  import * as crypto from 'crypto'; // Import the Node.js crypto module
  import { RequestWithUser } from '../users/interfaces/user.interface';
  
  @Controller('auth')
  export class AuthController {
    constructor(private authService: AuthService) {}
  
    @Post('nonce')
    async getNonce(@Body() nonceRequestDto: NonceRequestDto) {
      const { address } = nonceRequestDto;
      
      if (!address) {
        throw new BadRequestException('Wallet address is required');
      }
      
      return this.authService.generateNonce(address);
    }
  
    @Post('wallet-login')
    async walletLogin(
      @Body() walletLoginDto: WalletLoginDto,
      @Res() res: Response,
    ) {
      const { address, signature } = walletLoginDto;
      
      const { user, tokens } = await this.authService.authenticateWithWallet(
        address,
        signature,
      );
      
      // Set cookies
      this.authService.setCookies(res, tokens);
      
      return res.status(HttpStatus.OK).json({
        message: 'Authentication successful',
        user,
        csrfToken: res.getHeader('Set-Cookie')?.toString().match(/csrf-token=([^;]+)/)?.[1],
      });
    }
  
    @UseGuards(RefreshTokenGuard, CsrfGuard)
    @Post('refresh')
    async refreshTokens(@Req() req: RequestWithUser, @Res() res: Response) {
      const user = req.user;
      const tokens = await this.authService.refreshTokens(
        user.id,
        user.address,
        user.refreshToken,
      );
      
      // Set new cookies
      this.authService.setCookies(res, tokens);
      
      return res.status(HttpStatus.OK).json({
        message: 'Tokens refreshed successfully',
        csrfToken: res.getHeader('Set-Cookie')?.toString().match(/csrf-token=([^;]+)/)?.[1],
      });
    }
  
    @UseGuards(JwtAuthGuard, CsrfGuard)
    @Post('logout')
    async logout(@Req() req: RequestWithUser, @Res() res: Response) {
      await this.authService.logout(req.user.id);
      
      // Clear cookies
      this.authService.clearCookies(res);
      
      return res.status(HttpStatus.OK).json({
        message: 'Logged out successfully',
      });
    }
  
    @UseGuards(JwtAuthGuard)
    @Get('csrf-token')
    async getCsrfToken(@Res() res: Response) {
      // Generate new CSRF token
      const csrfToken = crypto.randomBytes(64).toString('hex');
      
      // Set CSRF token
      res.cookie('csrf-token', csrfToken, {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 15 * 60 * 1000, // 15 minutes
      });
      
      return res.status(HttpStatus.OK).json({
        csrfToken,
      });
    }
  }