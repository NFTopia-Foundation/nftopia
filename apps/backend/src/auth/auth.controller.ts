// auth.controller.ts
import {
  Controller,
  Post,
  Body,
  Res,
  HttpCode,
  Get,
  Req,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { Response, Request } from 'express';
import { JwtAuthGuard } from './jwt.guard';
import type { CookieOptions } from 'express';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';

@Controller('auth')
export class AuthController {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly authService: AuthService,
    private readonly jwtService: JwtService,
  ) {}

  private async generateTokens(user: User) {
    const payload = { sub: user.id, walletAddress: user.walletAddress };
    const accessToken = this.jwtService.sign(payload, { expiresIn: '15m' });
    const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });
    return { accessToken, refreshToken };
  }

  @Get('csrf-token')
  getCsrfToken(@Req() req: Request, @Res() res: Response) {
    const token = req.csrfToken();
    res.json({ csrfToken: token });
  }

  @Post('request-nonce')
  @HttpCode(200)
  requestNonce(@Body('walletAddress') walletAddress: string) {
    const nonce = this.authService.generateNonce(walletAddress);
    return { nonce };
  }

  @Post('verify-signature')
  @HttpCode(200)
  async verifySignature(
    @Body('walletAddress') walletAddress: string,
    @Body('signature') signature: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { accessToken, refreshToken, user } =
      await this.authService.verifySignature(walletAddress, signature);

    const cookieOptions: CookieOptions = {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    };

    res.cookie('access_token', accessToken, {
      ...cookieOptions,
      maxAge: 15 * 60 * 1000, // 15 mins
    });

    res.cookie('refresh_token', refreshToken, {
      ...cookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return { message: 'Authenticated', user };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getProfile(@Req() req: Request) {
    return req['user'];
  }

  @Post('refresh')
  @HttpCode(200)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = req.cookies['refresh_token'];
    if (!refreshToken) throw new UnauthorizedException();

    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET,
      });

      const user = await this.userRepo.findOne({ where: { id: payload.sub } });
      if (!user) throw new UnauthorizedException();

      const tokens = await this.generateTokens(user);

      res.cookie('access_token', tokens.accessToken, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 15 * 60 * 1000,
      });

      res.cookie('refresh_token', tokens.refreshToken, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      return { message: 'Refreshed successfully' };
    } catch (err) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('jwt');
    res.clearCookie('access_token');
    res.clearCookie('refresh_token');
    return { message: 'Logged out' };
  }
}

//frontend usage

//   const provider = new ethers.providers.Web3Provider(window.ethereum);
// const signer = provider.getSigner();
// const walletAddress = await signer.getAddress();

// const { data: nonceRes } = await axios.post('/auth/request-nonce', { walletAddress });
// const message = `Sign this message to log in: ${nonceRes.nonce}`;
// const signature = await signer.signMessage(message);

// await axios.post('/auth/verify-signature', {
//   walletAddress,
//   signature,
// }, { withCredentials: true });

// // Later: get current user
// await axios.get('/auth/me', { withCredentials: true });

//frontend usage of csrf-token

// function getCookie(name: string): string | null {
//     const value = `; ${document.cookie}`;
//     const parts = value.split(`; ${name}=`);
//     if (parts.length === 2) {
//       return parts.pop()?.split(';').shift() || null;
//     }
//     return null;
//   }

// const csrfTokenFromBackend = getCookie("XSRF-TOKEN");

// or by library

// pnpm add js-cookie

// import Cookies from 'js-cookie';

// const csrfTokenFromBackend = Cookies.get('XSRF-TOKEN');

// await fetch('/api/endpoint', {
//     method: 'POST',
//     headers: {
//       'Content-Type': 'application/json',
//       'X-CSRF-Token': csrfTokenFromBackend,
//     },
//     body: JSON.stringify(data),
//   });
