// src/dm/dm.service.ts
import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DmBlockService } from './services/dm-block.service';
import { SendMessageDto, MessageType } from './dto';
import * as sanitizeHtml from 'sanitize-html';

@Injectable()
export class DmService {
  private readonly logger = new Logger(DmService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly blockService: DmBlockService,
  ) {}

  // ========================================
  // 스레드 관리
  // ========================================

  /**
   * DM 스레드 시작/조회
   * - 기존 스레드 있으면 반환
   * - 없으면 새로 생성
   */
  async startThread(userId: string, targetUserId: string) {
    // 자기 자신에게 DM 불가
    if (userId === targetUserId) {
      throw new BadRequestException('자기 자신에게 메시지를 보낼 수 없습니다.');
    }

    // 차단 여부 확인
    const isBlocked = await this.blockService.isBlocked(userId, targetUserId);
    if (isBlocked) {
      throw new ForbiddenException('차단된 사용자에게 메시지를 보낼 수 없습니다.');
    }

    // 상대방 존재 확인
    const targetUser = await this.prisma.user.findUnique({
      where: { id: targetUserId },
    });
    if (!targetUser) {
      throw new NotFoundException('사용자를 찾을 수 없습니다.');
    }

    // user1Id < user2Id 로 정렬 (중복 방지)
    const [user1Id, user2Id] = [userId, targetUserId].sort();

    // 기존 스레드 조회 또는 생성
    let thread = await this.prisma.dmThread.findUnique({
      where: {
        user1Id_user2Id: { user1Id, user2Id },
      },
    });

    if (!thread) {
      thread = await this.prisma.dmThread.create({
        data: { user1Id, user2Id },
      });
    }

    return this.formatThread(thread, userId);
  }

  /**
   * 내 DM 스레드 목록 조회
   */
  async getThreads(userId: string, cursor?: string, limit: number = 20) {
    const threads = await this.prisma.dmThread.findMany({
      where: {
        OR: [
          { user1Id: userId },
          { user2Id: userId },
        ],
        lastMessageAt: { not: null }, // 메시지가 있는 스레드만
      },
      include: {
        user1: { select: { id: true, name: true, profileImage: true } },
        user2: { select: { id: true, name: true, profileImage: true } },
      },
      orderBy: { lastMessageAt: 'desc' },
      take: limit + 1,
      ...(cursor && {
        cursor: { id: cursor },
        skip: 1,
      }),
    });

    const hasMore = threads.length > limit;
    const items = hasMore ? threads.slice(0, -1) : threads;

    return {
      items: items.map(thread => this.formatThreadWithUser(thread, userId)),
      nextCursor: hasMore ? items[items.length - 1].id : null,
      hasMore,
    };
  }

  /**
   * 스레드 상세 조회
   */
  async getThread(userId: string, threadId: string) {
    const thread = await this.prisma.dmThread.findUnique({
      where: { id: threadId },
      include: {
        user1: { select: { id: true, name: true, profileImage: true } },
        user2: { select: { id: true, name: true, profileImage: true } },
      },
    });

    if (!thread) {
      throw new NotFoundException('대화를 찾을 수 없습니다.');
    }

    // 참여자 확인
    if (thread.user1Id !== userId && thread.user2Id !== userId) {
      throw new ForbiddenException('접근 권한이 없습니다.');
    }

    return this.formatThreadWithUser(thread, userId);
  }

  // ========================================
  // 메시지 관리
  // ========================================

  /**
   * 메시지 전송
   */
  async sendMessage(
    userId: string,
    threadId: string,
    dto: SendMessageDto,
  ) {
    // 스레드 조회 및 권한 확인
    const thread = await this.prisma.dmThread.findUnique({
      where: { id: threadId },
    });

    if (!thread) {
      throw new NotFoundException('대화를 찾을 수 없습니다.');
    }

    if (thread.user1Id !== userId && thread.user2Id !== userId) {
      throw new ForbiddenException('접근 권한이 없습니다.');
    }

    // 상대방 ID
    const targetUserId = thread.user1Id === userId ? thread.user2Id : thread.user1Id;

    // 차단 여부 확인
    const isBlocked = await this.blockService.isBlocked(userId, targetUserId);
    if (isBlocked) {
      throw new ForbiddenException('차단된 사용자에게 메시지를 보낼 수 없습니다.');
    }

    // 메시지 정제 (XSS 방어)
    const sanitizedContent = this.sanitizeMessage(dto.content);

    // 트랜잭션으로 메시지 저장 + 스레드 업데이트
    const [message] = await this.prisma.$transaction([
      // 메시지 생성
      this.prisma.dmMessage.create({
        data: {
          threadId,
          senderId: userId,
          content: sanitizedContent,
          messageType: dto.messageType || MessageType.TEXT,
          metadata: dto.metadata || null,
        },
        include: {
          sender: { select: { id: true, name: true, profileImage: true } },
        },
      }),
      // 스레드 업데이트
      this.prisma.dmThread.update({
        where: { id: threadId },
        data: {
          lastMessage: sanitizedContent.slice(0, 100),
          lastMessageAt: new Date(),
          // 상대방 unread 카운트 증가
          ...(thread.user1Id === userId
            ? { unreadCountUser2: { increment: 1 } }
            : { unreadCountUser1: { increment: 1 } }),
        },
      }),
    ]);

    return this.formatMessage(message);
  }

  /**
   * 메시지 목록 조회
   */
  async getMessages(
    userId: string,
    threadId: string,
    cursor?: string,
    limit: number = 50,
  ) {
    // 권한 확인
    const thread = await this.prisma.dmThread.findUnique({
      where: { id: threadId },
    });

    if (!thread) {
      throw new NotFoundException('대화를 찾을 수 없습니다.');
    }

    if (thread.user1Id !== userId && thread.user2Id !== userId) {
      throw new ForbiddenException('접근 권한이 없습니다.');
    }

    const messages = await this.prisma.dmMessage.findMany({
      where: { threadId },
      include: {
        sender: { select: { id: true, name: true, profileImage: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      ...(cursor && {
        cursor: { id: cursor },
        skip: 1,
      }),
    });

    const hasMore = messages.length > limit;
    const items = hasMore ? messages.slice(0, -1) : messages;

    // 읽음 처리 (비동기)
    this.markAsRead(userId, threadId).catch(err =>
      this.logger.error('Failed to mark as read', err)
    );

    return {
      items: items.map(msg => this.formatMessage(msg)).reverse(), // 오래된→최신 순
      nextCursor: hasMore ? items[items.length - 1].id : null,
      hasMore,
    };
  }

  /**
   * 읽음 처리
   */
  async markAsRead(userId: string, threadId: string) {
    const thread = await this.prisma.dmThread.findUnique({
      where: { id: threadId },
    });

    if (!thread) return;
    if (thread.user1Id !== userId && thread.user2Id !== userId) return;

    await this.prisma.$transaction([
      // 메시지 읽음 처리
      this.prisma.dmMessage.updateMany({
        where: {
          threadId,
          senderId: { not: userId },
          isRead: false,
        },
        data: {
          isRead: true,
          readAt: new Date(),
        },
      }),
      // unread 카운트 초기화
      this.prisma.dmThread.update({
        where: { id: threadId },
        data: thread.user1Id === userId
          ? { unreadCountUser1: 0 }
          : { unreadCountUser2: 0 },
      }),
    ]);

    return { success: true };
  }

  /**
   * 전체 안읽음 카운트
   */
  async getUnreadCount(userId: string): Promise<number> {
    const threads = await this.prisma.dmThread.findMany({
      where: {
        OR: [
          { user1Id: userId },
          { user2Id: userId },
        ],
      },
      select: {
        user1Id: true,
        unreadCountUser1: true,
        unreadCountUser2: true,
      },
    });

    return threads.reduce((total, thread) => {
      const count = thread.user1Id === userId
        ? thread.unreadCountUser1
        : thread.unreadCountUser2;
      return total + count;
    }, 0);
  }

  // ========================================
  // 헬퍼 메서드
  // ========================================

  /**
   * XSS 방어를 위한 메시지 정제
   */
  private sanitizeMessage(content: string): string {
    return sanitizeHtml(content, {
      allowedTags: [], // 모든 HTML 태그 제거
      allowedAttributes: {},
    }).trim();
  }

  private formatThread(thread: any, userId: string) {
    const isUser1 = thread.user1Id === userId;
    return {
      id: thread.id,
      partnerId: isUser1 ? thread.user2Id : thread.user1Id,
      lastMessage: thread.lastMessage,
      lastMessageAt: thread.lastMessageAt,
      unreadCount: isUser1 ? thread.unreadCountUser1 : thread.unreadCountUser2,
      createdAt: thread.createdAt,
    };
  }

  private formatThreadWithUser(thread: any, userId: string) {
    const isUser1 = thread.user1Id === userId;
    const partner = isUser1 ? thread.user2 : thread.user1;
    
    return {
      id: thread.id,
      partner: {
        id: partner.id,
        name: partner.name,
        profileImage: partner.profileImage,
      },
      lastMessage: thread.lastMessage,
      lastMessageAt: thread.lastMessageAt,
      unreadCount: isUser1 ? thread.unreadCountUser1 : thread.unreadCountUser2,
      createdAt: thread.createdAt,
    };
  }

  private formatMessage(message: any) {
    return {
      id: message.id,
      threadId: message.threadId,
      sender: message.sender,
      content: message.content,
      messageType: message.messageType,
      metadata: message.metadata,
      isRead: message.isRead,
      readAt: message.readAt,
      createdAt: message.createdAt,
    };
  }
}
