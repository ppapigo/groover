// src/dm/dm.service.ts
// 기존 코드에 직거래 방지 기능만 추가한 버전

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

// 🆕 직거래 방지 패턴
const BLOCKED_PATTERNS: { pattern: RegExp; type: string }[] = [
  { pattern: /\d{3,4}[-\s]?\d{2,4}[-\s]?\d{4,7}/g, type: 'BANK_ACCOUNT' },
  { pattern: /01[0-9][-.\s]?\d{3,4}[-.\s]?\d{4}/g, type: 'PHONE_NUMBER' },
  { pattern: /카[카톡오]\s*[:=]?\s*[a-zA-Z0-9_]{2,20}/gi, type: 'KAKAO_ID' },
  { pattern: /오픈\s*채팅/gi, type: 'KAKAO_OPENCHAT' },
  { pattern: /텔레그램\s*[:=]?\s*@?[a-zA-Z0-9_]{2,30}/gi, type: 'TELEGRAM' },
  { pattern: /t\.me\/[a-zA-Z0-9_]+/gi, type: 'TELEGRAM_LINK' },
  { pattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, type: 'EMAIL' },
  { pattern: /계좌\s*(번호|입금|송금)/gi, type: 'BANK_KEYWORD' },
  { pattern: /직거래/gi, type: 'DIRECT_TRADE' },
];

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

  async startThread(userId: string, targetUserId: string) {
    if (userId === targetUserId) {
      throw new BadRequestException('자기 자신에게 메시지를 보낼 수 없습니다.');
    }

    const isBlocked = await this.blockService.isBlocked(userId, targetUserId);
    if (isBlocked) {
      throw new ForbiddenException('차단된 사용자에게 메시지를 보낼 수 없습니다.');
    }

    const targetUser = await this.prisma.user.findUnique({
      where: { id: targetUserId },
    });
    if (!targetUser) {
      throw new NotFoundException('사용자를 찾을 수 없습니다.');
    }

    const [user1Id, user2Id] = [userId, targetUserId].sort();

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

  async getThreads(userId: string, cursor?: string, limit: number = 20) {
    const threads = await this.prisma.dmThread.findMany({
      where: {
        OR: [
          { user1Id: userId },
          { user2Id: userId },
        ],
        lastMessageAt: { not: null },
      },
      include: {
        user1: { select: { id: true, name: true, profileImageUrl: true } },
        user2: { select: { id: true, name: true, profileImageUrl: true } },
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

  async getThread(userId: string, threadId: string) {
    const thread = await this.prisma.dmThread.findUnique({
      where: { id: threadId },
      include: {
        user1: { select: { id: true, name: true, profileImageUrl: true } },
        user2: { select: { id: true, name: true, profileImageUrl: true } },
      },
    });

    if (!thread) {
      throw new NotFoundException('대화를 찾을 수 없습니다.');
    }

    if (thread.user1Id !== userId && thread.user2Id !== userId) {
      throw new ForbiddenException('접근 권한이 없습니다.');
    }

    return this.formatThreadWithUser(thread, userId);
  }

  // ========================================
  // 메시지 관리
  // ========================================

  async sendMessage(
    userId: string,
    threadId: string,
    dto: SendMessageDto,
  ) {
    const thread = await this.prisma.dmThread.findUnique({
      where: { id: threadId },
    });

    if (!thread) {
      throw new NotFoundException('대화를 찾을 수 없습니다.');
    }

    if (thread.user1Id !== userId && thread.user2Id !== userId) {
      throw new ForbiddenException('접근 권한이 없습니다.');
    }

    const targetUserId = thread.user1Id === userId ? thread.user2Id : thread.user1Id;

    const isBlocked = await this.blockService.isBlocked(userId, targetUserId);
    if (isBlocked) {
      throw new ForbiddenException('차단된 사용자에게 메시지를 보낼 수 없습니다.');
    }

    // 메시지 정제 (XSS 방어)
    const sanitizedContent = this.sanitizeMessage(dto.content);

    // 🆕 직거래 방지 검사
    const tradeCheck = await this.checkDirectTrade(userId, threadId, sanitizedContent);
    if (!tradeCheck.allowed) {
      throw new ForbiddenException(tradeCheck.message);
    }

    const [message] = await this.prisma.$transaction([
      this.prisma.dmMessage.create({
        data: {
          threadId,
          senderId: userId,
          content: sanitizedContent,
          messageType: dto.messageType || MessageType.TEXT,
          metadata: dto.metadata || null,
        },
        include: {
          sender: { select: { id: true, name: true, profileImageUrl: true } },
        },
      }),
      this.prisma.dmThread.update({
        where: { id: threadId },
        data: {
          lastMessage: sanitizedContent.slice(0, 100),
          lastMessageAt: new Date(),
          ...(thread.user1Id === userId
            ? { unreadCountUser2: { increment: 1 } }
            : { unreadCountUser1: { increment: 1 } }),
        },
      }),
    ]);

    return this.formatMessage(message);
  }

  async getMessages(
    userId: string,
    threadId: string,
    cursor?: string,
    limit: number = 50,
  ) {
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
        sender: { select: { id: true, name: true, profileImageUrl: true } },
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

    this.markAsRead(userId, threadId).catch(err =>
      this.logger.error('Failed to mark as read', err)
    );

    return {
      items: items.map(msg => this.formatMessage(msg)).reverse(),
      nextCursor: hasMore ? items[items.length - 1].id : null,
      hasMore,
    };
  }

  async markAsRead(userId: string, threadId: string) {
    const thread = await this.prisma.dmThread.findUnique({
      where: { id: threadId },
    });

    if (!thread) return;
    if (thread.user1Id !== userId && thread.user2Id !== userId) return;

    await this.prisma.$transaction([
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
      this.prisma.dmThread.update({
        where: { id: threadId },
        data: thread.user1Id === userId
          ? { unreadCountUser1: 0 }
          : { unreadCountUser2: 0 },
      }),
    ]);

    return { success: true };
  }

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
  // 🆕 직거래 방지
  // ========================================

  /**
   * 직거래 시도 검사
   */
  private async checkDirectTrade(
    userId: string,
    threadId: string,
    content: string,
  ): Promise<{ allowed: boolean; message?: string }> {
    const detectedTypes: string[] = [];

    for (const { pattern, type } of BLOCKED_PATTERNS) {
      const regex = new RegExp(pattern.source, pattern.flags);
      if (regex.test(content)) {
        detectedTypes.push(type);
      }
    }

    if (detectedTypes.length === 0) {
      return { allowed: true };
    }

    // 직거래 시도 로그 저장
    try {
      await this.prisma.directTradeAttempt.create({
        data: {
          userId,
          threadId,
          originalContent: content,
          detectedPatterns: detectedTypes,
          detectedTypes: detectedTypes,
        },
      });

      // 경고 횟수 증가
      await this.prisma.user.update({
        where: { id: userId },
        data: { warningCount: { increment: 1 } },
      });

      await this.prisma.userWarning.create({
        data: {
          userId,
          type: 'DIRECT_TRADE_ATTEMPT',
          reason: `직거래 시도: ${detectedTypes.join(', ')}`,
        },
      });

      // 경고 3회 이상 → 광고 매칭 정지
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { warningCount: true },
      });

      if (user && user.warningCount >= 3) {
        const suspendedUntil = new Date();
        suspendedUntil.setDate(suspendedUntil.getDate() + 1);

        await this.prisma.user.update({
          where: { id: userId },
          data: {
            adMatchingSuspended: true,
            suspendedUntil,
          },
        });
      }
    } catch (error) {
      this.logger.error('직거래 로그 저장 실패:', error);
    }

    return {
      allowed: false,
      message: '안전결제 보호를 위해 외부 연락처 공유가 제한됩니다. 모든 광고비 결제는 Groover를 통해 진행해주세요.',
    };
  }

  // ========================================
  // 헬퍼 메서드
  // ========================================

  private sanitizeMessage(content: string): string {
    return sanitizeHtml(content, {
      allowedTags: [],
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
        profileImageUrl: partner.profileImageUrl,
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
