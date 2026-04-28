import { Module } from '@nestjs/common';

import { RealtimeController } from './realtime.controller';
import { RealtimeGateway } from './realtime.gateway';
import { clearScreenDown } from 'readline';

@Module({
  controllers: [RealtimeController],
  providers: [RealtimeGateway],
  exports: [RealtimeGateway],
})
export class RealtimeModule {}clearScreenDown