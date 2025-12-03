// src/dm/dm.gateway.ts
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DmService } from './dm.service';
import { DmBlockService } from './services/dm-block.service';
import { SendMessageDto } from './dto';

interface AuthenticatedSocket extends Socket {
  userId?: string;
}

/**
 * DM WebSocket Gateway
 * 
 * 실시간 기능:
 * - 메시지 전송/수신
 * - 읽음 상태 동기화
 * - 타이핑 표시
 * - 온라인 상태
 */
@WebSocketGateway({
  namespace: '/dm',
  cors: {
    origin: '*', // 프로덕션에서는 특정 도메인만 허용
    credentials: true,
  },
})
export class DmGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(DmGateway.name);
  
  // 사용자별 소켓 매핑
  private userSockets: Map<string, Set<string>> = new Map();

  constructor(
    private readonly jwtService: JwtService,
    private readonly dmService: DmService,
    private readonly blockService: DmBlockService,
  ) {}

  // ========================================
  // 연결 관리
  // ========================================

  async handleConnection(client: AuthenticatedSocket) {
    try {
      // JWT 토큰 검증
      const token = client.handshake.auth?.token || 
                    client.handshake.headers?.authorization?.replace('Bearer ', '');
      
      if (!token) {
        this.logger.warn(`Connection rejected: No token`);
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token);
      client.userId = payload.sub;

      // 사용자 소켓 등록
      if (!this.userSockets.has(client.userId)) {
        this.userSockets.set(client.userId, new Set());
      }
      this.userSockets.get(client.userId)!.add(client.id);

      // 사용자 전용 룸 참가
      client.join(`user:${client.userId}`);

      this.logger.log(`Client connected: ${client.id} (User: ${client.userId})`);

      // 온라인 상태 브로드캐스트
      this.broadcastOnlineStatus(client.userId, true);

    } catch (error) {
      this.logger.error(`Connection error: ${error.message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    if (client.userId) {
      const userSocketSet = this.userSockets.get(client.userId);
      if (userSocketSet) {
        userSocketSet.delete(client.id);
        if (userSocketSet.size === 0) {
          this.userSockets.delete(client.userId);
          // 오프라인 상태 브로드캐스트
          this.broadcastOnlineStatus(client.userId, false);
        }
      }
    }
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  // ========================================
  // 메시지 이벤트
  // ========================================

  /**
   * 스레드 참가 (메시지 수신 준비)
   */
  @SubscribeMessage('join_thread')
  async handleJoinThread(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { threadId: string },
  ) {
    if (!client.userId) return;

    try {
      // 권한 확인
      await this.dmService.getThread(client.userId, data.threadId);
      
      // 스레드 룸 참가
      client.join(`thread:${data.threadId}`);
      
      this.logger.log(`User ${client.userId} joined thread ${data.threadId}`);
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * 스레드 퇴장
   */
  @SubscribeMessage('leave_thread')
  handleLeaveThread(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { threadId: string },
  ) {
    client.leave(`thread:${data.threadId}`);
    return { success: true };
  }

  /**
   * 메시지 전송
   */
  @SubscribeMessage('send_message')
  async handleSendMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { threadId: string; message: SendMessageDto },
  ) {
    if (!client.userId) return { success: false, error: 'Unauthorized' };

    try {
      const message = await this.dmService.sendMessage(
        client.userId,
        data.threadId,
        data.message,
      );

      // 스레드 참가자들에게 브로드캐스트
      this.server.to(`thread:${data.threadId}`).emit('new_message', {
        threadId: data.threadId,
        message,
      });

      // 스레드에 참가하지 않은 상대방에게도 알림
      const thread = await this.dmService.getThread(client.userId, data.threadId);
      this.server.to(`user:${thread.partner.id}`).emit('thread_updated', {
        threadId: data.threadId,
        lastMessage: message.content,
        lastMessageAt: message.createdAt,
        unreadCount: 1,
      });

      return { success: true, data: message };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * 읽음 처리
   */
  @SubscribeMessage('mark_read')
  async handleMarkRead(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { threadId: string },
  ) {
    if (!client.userId) return;

    try {
      await this.dmService.markAsRead(client.userId, data.threadId);

      // 상대방에게 읽음 이벤트 전송
      this.server.to(`thread:${data.threadId}`).emit('messages_read', {
        threadId: data.threadId,
        readBy: client.userId,
        readAt: new Date(),
      });

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * 타이핑 표시
   */
  @SubscribeMessage('typing')
  handleTyping(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { threadId: string; isTyping: boolean },
  ) {
    if (!client.userId) return;

    // 스레드의 다른 참가자들에게 브로드캐스트
    client.to(`thread:${data.threadId}`).emit('user_typing', {
      threadId: data.threadId,
      userId: client.userId,
      isTyping: data.isTyping,
    });
  }

  // ========================================
  // 헬퍼 메서드
  // ========================================

  /**
   * 특정 사용자에게 이벤트 전송
   */
  sendToUser(userId: string, event: string, data: any) {
    this.server.to(`user:${userId}`).emit(event, data);
  }

  /**
   * 사용자 온라인 상태 브로드캐스트
   */
  private broadcastOnlineStatus(userId: string, isOnline: boolean) {
    this.server.emit('user_status', {
      userId,
      isOnline,
      lastSeen: isOnline ? null : new Date(),
    });
  }

  /**
   * 사용자 온라인 여부 확인
   */
  isUserOnline(userId: string): boolean {
    return this.userSockets.has(userId);
  }

  /**
   * 온라인 사용자 목록
   */
  getOnlineUsers(): string[] {
    return Array.from(this.userSockets.keys());
  }
}
