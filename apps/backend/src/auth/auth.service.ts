// auth.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { verifyMessage } from 'ethers';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    private jwtService: JwtService,
  ) {}

  private nonces = new Map<string, string>();

  generateNonce(walletAddress: string) {
    const nonce = Math.floor(Math.random() * 1000000).toString();
    this.nonces.set(walletAddress.toLowerCase(), nonce);
    return nonce;
  }

  async generateTokens(user: User) {
    const payload = { sub: user.id, walletAddress: user.walletAddress };
  
    const accessToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_ACCESS_SECRET,
      expiresIn: process.env.JWT_ACCESS_EXPIRY || '15m',
    });
  
    const refreshToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_REFRESH_SECRET,
      expiresIn: process.env.JWT_REFRESH_EXPIRY || '7d',
    });
  
    return { accessToken, refreshToken };
  }
  

  async verifySignature(walletAddress: string, signature: string) {
    const nonce = this.nonces.get(walletAddress.toLowerCase());
    if (!nonce) throw new Error('Nonce not found');
  
    const message = `Sign this message to log in: ${nonce}`;
    const recovered = verifyMessage(message, signature);
  
    if (recovered.toLowerCase() !== walletAddress.toLowerCase()) {
      throw new Error('Invalid signature');
    }
  
    let user = await this.userRepo.findOne({ where: { walletAddress } });
    if (!user) {
      user = this.userRepo.create({ walletAddress });
      await this.userRepo.save(user);
    }
  
    const tokens = await this.generateTokens(user);
    return { ...tokens, user };
  }
} 
