import { Body, Controller, Post } from '@nestjs/common';

import { RealtimeGateway } from './realtime.gateway';

@Controller('realtime')
export class RealtimeController {
  constructor(private readonly realtimeGateway: RealtimeGateway) {}

  @Post('test/user')
  sendTestToUser(
    @Body()
    body: {
      userId: string;
      event: string;
      payload: unknown;
    },
  ) {
    this.realtimeGateway.emitToUser(
      body.userId,
      body.event || 'test:event',
      body.payload ?? { ok: true },
    );

    return {
      success: true,
      message: 'Test event sent',
    };
  }
}