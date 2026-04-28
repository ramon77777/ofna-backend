import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';

type SocketUserPayload = {
  userId: string;
  role?: string;
};

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: '/realtime',
})
export class RealtimeGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(RealtimeGateway.name);

  @WebSocketServer()
  server!: Server;

  handleConnection(client: Socket): void {
    this.logger.log(`Socket connected: ${client.id}`);
  }

  handleDisconnect(client: Socket): void {
    this.logger.log(`Socket disconnected: ${client.id}`);
  }

    @SubscribeMessage('auth:identify')
  async identifyUser(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: SocketUserPayload,
  ): Promise<{ success: boolean; room?: string; message: string }> {
    if (!payload?.userId) {
      return {
        success: false,
        message: 'userId is required',
      };
    }

    const room = this.getUserRoom(payload.userId);
    await client.join(room);

    this.logger.log(
      `Socket ${client.id} joined personal room ${room} (role=${payload.role ?? 'unknown'})`,
    );

    return {
      success: true,
      room,
      message: 'Socket identified successfully',
    };
  }

  emitToUser(userId: string, event: string, data: unknown): void {
    const room = this.getUserRoom(userId);
    this.server.to(room).emit(event, data);

    this.logger.log(
      `Emitted event "${event}" to user room ${room}`,
    );
  }

  emitToManyUsers(userIds: string[], event: string, data: unknown): void {
    const uniqueUserIds = [...new Set(userIds)];

    for (const userId of uniqueUserIds) {
      this.emitToUser(userId, event, data);
    }
  }

  emitToAll(event: string, data: unknown): void {
    this.server.emit(event, data);
    this.logger.log(`Broadcast event "${event}" to all sockets`);
  }

  private getUserRoom(userId: string): string {
    return `user:${userId}`;
  }
}