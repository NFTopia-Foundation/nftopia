import { Module } from '@nestjs/common';
import { StarknetService } from './starknet.service';
import { StarknetController } from './starknet.controller';
import { ConfigModule } from '@nestjs/config';
import { ListenerModule } from './listeners';
@Module({
  imports: [
    ConfigModule,
    ListenerModule,
  ],
  providers: [StarknetService],
  controllers: [StarknetController],
  exports: [StarknetService],
})
export class StarknetModule {}