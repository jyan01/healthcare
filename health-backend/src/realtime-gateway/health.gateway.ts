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
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { MemberService } from '../member/member.service';
import { JwtPayload } from '../shared';

interface SocketData {
  user?: JwtPayload;
}

@WebSocketGateway({ namespace: 'health', cors: { origin: '*' } })
export class HealthGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(HealthGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly memberService: MemberService,
  ) {}

  handleConnection(client: Socket): void {
    const token = this.extractToken(client);
    if (!token) {
      client.emit('error', { code: 'AUTH_FAILED' });
      client.disconnect(true);
      return;
    }
    try {
      const payload = this.jwtService.verify<JwtPayload>(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });
      (client.data as SocketData).user = payload;
      this.logger.log(`WS 연결: ${payload.userId} (${client.id})`);
    } catch {
      client.emit('error', { code: 'AUTH_FAILED' });
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket): void {
    const user = (client.data as SocketData).user;
    if (user) this.logger.log(`WS 연결 종료: ${user.userId} (${client.id})`);
  }

  @SubscribeMessage('subscribe')
  async handleSubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { memberId: string },
  ): Promise<void> {
    const user = (client.data as SocketData).user;
    if (!user) {
      client.emit('error', { code: 'AUTH_FAILED' });
      return;
    }
    const requester = await this.memberService.findById(user.userId);
    if (!requester) {
      client.emit('error', { code: 'AUTH_FAILED' });
      return;
    }
    if (requester.memberType === 'P' && requester.memberId !== data?.memberId) {
      client.emit('error', { code: 'FORBIDDEN' });
      return;
    }
    await client.join(`member:${data.memberId}`);
  }

  @SubscribeMessage('ping')
  handlePing(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: unknown,
  ): void {
    client.emit('pong', data);
  }

  /** SimulatorClientService가 DB 저장 완료 후 구독자에게 실시간 push할 때 사용 */
  emitToMember(memberId: string, event: string, data: unknown): void {
    this.server?.to(`member:${memberId}`).emit(event, data);
  }

  private extractToken(client: Socket): string | undefined {
    const authToken = (
      client.handshake.auth as Record<string, unknown> | undefined
    )?.token;
    if (typeof authToken === 'string') return authToken;
    const queryToken = client.handshake.query?.token;
    if (typeof queryToken === 'string') return queryToken;
    return undefined;
  }
}
