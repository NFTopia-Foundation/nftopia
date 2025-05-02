// jwt.strategy.ts
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';
import { Request } from 'express';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: (req: Request) => req.cookies['jwt'],
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'my_jwt_secret',
    });

    console.log("JWT_SECRET:", process.env.JWT_SECRET);
  }

  async validate(payload: any) {
    return {
      id: payload.sub,
      walletAddress: payload.walletAddress,
      isArtist: payload.isArtist,
      username: payload.username, // optional
    };
  }  
}
