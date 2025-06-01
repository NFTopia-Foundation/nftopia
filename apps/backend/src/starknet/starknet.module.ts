import { Module } from '@nestjs/common';
import { StarknetService } from './starknet.service';
import { StarknetController } from './starknet.controller';

@Module({
  providers: [StarknetService],
  controllers: [StarknetController],
  exports: [StarknetService],
})
export class StarknetModule {}
