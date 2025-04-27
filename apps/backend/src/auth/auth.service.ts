import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import * as crypto from 'crypto';
import { UsersService } from '../users/users.service';
import { NonceService } from './nonce.service';
import { SignatureUtil } from './utils/signature.util';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { TokenPayload } from './interfaces/token-payload.interface';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private nonceService: NonceService,
  ) {
    // Start periodic cleanup of expired nonces
    this.nonceService.startPeriodicCleanup();
  }

  /**
   * Generate nonce for wallet authentication
   */
  async generateNonce(address: string): Promise<{ nonce: string; message: string }> {
    if (!address) {
      throw new BadRequestException('Wallet address is required');
    }
    
    const nonce = this.nonceService.generateNonce(address);
    const messageToSign = this.nonceService.getMessageToSign(nonce);
    
    return {
      nonce,
      message: messageToSign,
    };
  }

  /**
   * Authenticate user with wallet signature
   */
  async authenticateWithWallet(
    address: string,
    signature: string,
  ): Promise<{ user: any; tokens: TokenPayload }> {
    if (!address || !signature) {
      throw new BadRequestException('Wallet address and signature are required');
    }
    
    // Extract nonce from signature message (in a real app, you would store the nonce with the address)
    // Here we're simplifying by assuming the nonce is part of the signature message
    const signatureMessage = signature.split('Nonce: ')[1]?.split('"')[0];
    
    if (!signatureMessage) {
      throw new UnauthorizedException('Invalid signature format');
    }
    
    // Validate nonce
    const isNonceValid = this.nonceService.validateAndConsumeNonce(
      address,
      signatureMessage,
    );
    
    if (!isNonceValid) {
      throw new UnauthorizedException('Invalid or expired nonce');
    }
    
    // Verify signature
    const messageToSign = this.nonceService.getMessageToSign(signatureMessage);
    const isSignatureValid = await SignatureUtil.verifyStarkNetSignature(
      messageToSign,
      signature,
      address,
    );
    
    if (!isSignatureValid) {
      throw new UnauthorizedException('Invalid signature');
    }
    
    // Find user or create if doesn't exist
    let user = await this.usersService.findByAddress(address);
    
    if (!user) {
      user = await this.usersService.createUser(address);
    }
    
    // Update last login
    await this.usersService.updateLastLogin(user.id);
    
    // Generate tokens
    const tokens = await this.generateTokens(user.id, user.address);
    
    // Update refresh token in user record
    await this.usersService.updateRefreshToken(user.id, tokens.refreshToken);
    
    return {
      user: {
        id: user.id,
        address: user.address,
      },
      tokens,
    };
  }

  /**
   * Generate JWT tokens (access + refresh)
   */
  async generateTokens(userId: string, address: string): Promise<TokenPayload> {
    const payload: JwtPayload = {
      sub: userId,
      address,
    };
    
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_SECRET'),
        expiresIn: '15m', // 15 minutes
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: '7d', // 7 days
      }),
    ]);
    
    return {
      accessToken,
      refreshToken,
    };
  }

  /**
   * Refresh tokens
   */
  async refreshTokens(userId: string, address: string, currentRefreshToken: string): Promise<TokenPayload> {
    const user = await this.usersService.findById(userId);
    
    if (!user || user.refreshToken !== currentRefreshToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    
    const tokens = await this.generateTokens(userId, address);
    
    // Update refresh token
    await this.usersService.updateRefreshToken(userId, tokens.refreshToken);
    
    return tokens;
  }

  /**
   * Set authentication cookies
   */
  setCookies(res: Response, tokens: TokenPayload): void {
    // Set CSRF token
    const csrfToken = crypto.randomBytes(64).toString('hex');
    
    // Set cookies
    res.cookie('accessToken', tokens.accessToken, {
      httpOnly: true, // Not accessible via JavaScript
      secure: this.configService.get<string>('NODE_ENV') === 'production', // HTTPS only in production
      sameSite: 'strict', // Prevent CSRF
      maxAge: 15 * 60 * 1000, // 15 minutes
    });
    
    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: this.configService.get<string>('NODE_ENV') === 'production',
      sameSite: 'strict',
      path: '/auth/refresh', // Only sent with refresh token requests
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
    
    // Set CSRF token (accessible via JavaScript)
    res.cookie('csrf-token', csrfToken, {
      httpOnly: false, // Accessible via JavaScript
      secure: this.configService.get<string>('NODE_ENV') === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000, // 15 minutes
    });
  }

  /**
   * Clear authentication cookies
   */
  clearCookies(res: Response): void {
    res.cookie('accessToken', '', {
      httpOnly: true,
      secure: this.configService.get<string>('NODE_ENV') === 'production',
      sameSite: 'strict',
      maxAge: 0,
    });
    
    res.cookie('refreshToken', '', {
      httpOnly: true,
      secure: this.configService.get<string>('NODE_ENV') === 'production',
      sameSite: 'strict',
      path: '/auth/refresh',
      maxAge: 0,
    });
    
    res.cookie('csrf-token', '', {
      httpOnly: false,
      secure: this.configService.get<string>('NODE_ENV') === 'production',
      sameSite: 'strict',
      maxAge: 0,
    });
  }

  /**
   * Log user out
   */
  async logout(userId: string): Promise<void> {
    // Remove refresh token from user record
    await this.usersService.updateRefreshToken(userId, null);
  }
}
