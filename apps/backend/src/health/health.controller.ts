import { Controller, Get } from '@nestjs/common';
import mongoose from 'mongoose';

@Controller('health')
export class HealthController {
  @Get()
  checkMongoHealth() {
    const state = mongoose.connection.readyState;
    const status = state === 1 ? 'UP' : 'DOWN';

    return {
      status,
      dbState: state, // 0=disconnected, 1=connected, 2=connecting, 3=disconnecting
    };
  }
}
