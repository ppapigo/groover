// src/notification/notification.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationType, PUSH_PRIORITY } from './dto/notification.dto';

interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  targetType?: string;
  targetId?: string;
  metadata?: any;
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ========================================
  // 알림 생성 (내부 호출용)
  // ========================================

  async create(params: CreateNotificationParams) {
    const { userId, type, title, message, targetType, targetId, metadata } = params;

    try {
      // 1. DB에 알림 저장
      const notification = await this.prisma.notification.create({
        data: {
          userId,
          type,
          title,
          message,
          targetType,
          targetId,
          metadata,
        },
      });

      // 2. 중요한 알림만 푸시 발송
      if (PUSH_PRIORITY[type]) {
        await this.sendPush(userId, notification.id, title, message);
      }

      this.logger.log(`알림 생성: userId=${userId}, type=${type}`);
      return notification;
    } catch (error) {
      this.logger.error('알림 생성 실패:', error);
      throw error;
    }
  }

  // ========================================
  // 알림 조회
  // ========================================

  async getNotifications(userId: string, cursor?: string, limit: number = 20) {
    const notifications = await this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      ...(cursor && {
        cursor: { id: cursor },
        skip: 1,
      }),
    });

    const hasMore = notifications.length > limit;
    const items = hasMore ? notifications.slice(0, -1) : notifications;

    // 안읽은 개수
    const unreadCount = await this.prisma.notification.count({
      where: { userId, isRead: false },
    });

    return {
      items: items.map(n => ({
        id: n.id,
        type: n.type,
        title: n.title,
        message: n.message,
        targetType: n.targetType,
        targetId: n.targetId,
        metadata: n.metadata,
        isRead: n.isRead,
        createdAt: n.createdAt,
      })),
      unreadCount,
      hasMore,
      nextCursor: hasMore ? items[items.length - 1].id : null,
    };
  }

  // ========================================
  // 읽음 처리
  // ========================================

  async markAsRead(userId: string, notificationId?: string) {
    if (notificationId) {
      // 단일 읽음
      await this.prisma.notification.updateMany({
        where: { id: notificationId, userId },
        data: { isRead: true, readAt: new Date() },
      });
    } else {
      // 전체 읽음
      await this.prisma.notification.updateMany({
        where: { userId, isRead: false },
        data: { isRead: true, readAt: new Date() },
      });
    }

    return { success: true };
  }

  // ========================================
  // 안읽은 개수
  // ========================================

  async getUnreadCount(userId: string): Promise<number> {
    return this.prisma.notification.count({
      where: { userId, isRead: false },
    });
  }

  // ========================================
  // 푸시 토큰 관리
  // ========================================

  async registerPushToken(userId: string, token: string, platform: string, deviceId?: string) {
    // 기존 토큰 비활성화 (같은 디바이스)
    if (deviceId) {
      await this.prisma.pushToken.updateMany({
        where: { userId, deviceId },
        data: { isActive: false },
      });
    }

    // 토큰 등록 (upsert)
    return this.prisma.pushToken.upsert({
      where: { token },
      create: { userId, token, platform, deviceId, isActive: true },
      update: { userId, platform, deviceId, isActive: true },
    });
  }

  async removePushToken(token: string) {
    await this.prisma.pushToken.updateMany({
      where: { token },
      data: { isActive: false },
    });
    return { success: true };
  }

  // ========================================
  // 푸시 발송 (FCM)
  // ========================================

  private async sendPush(userId: string, notificationId: string, title: string, message: string) {
    try {
      // 유저의 활성 토큰 조회
      const tokens = await this.prisma.pushToken.findMany({
        where: { userId, isActive: true },
        select: { token: true, platform: true },
      });

      if (tokens.length === 0) {
        return;
      }

      // FCM 발송 (실제 구현 필요)
      // await this.fcmService.sendMulticast(tokens, title, message);

      // 발송 완료 표시
      await this.prisma.notification.update({
        where: { id: notificationId },
        data: { isPushed: true, pushedAt: new Date() },
      });

      this.logger.log(`푸시 발송: userId=${userId}, tokens=${tokens.length}`);
    } catch (error) {
      this.logger.error('푸시 발송 실패:', error);
    }
  }

  // ========================================
  // 편의 메서드 - 거래 알림
  // ========================================

  async notifyDealProposed(creatorId: string, dealId: string, advertiserName: string, title: string) {
    return this.create({
      userId: creatorId,
      type: NotificationType.DEAL_PROPOSED,
      title: '새로운 광고 제안',
      message: `${advertiserName}님이 "${title}" 광고를 제안했습니다.`,
      targetType: 'deal',
      targetId: dealId,
    });
  }

  async notifyDealAccepted(advertiserId: string, dealId: string, creatorName: string, title: string) {
    return this.create({
      userId: advertiserId,
      type: NotificationType.DEAL_ACCEPTED,
      title: '제안 수락됨',
      message: `${creatorName}님이 "${title}" 제안을 수락했습니다.`,
      targetType: 'deal',
      targetId: dealId,
    });
  }

  async notifyDealPaid(creatorId: string, dealId: string, amount: number, title: string) {
    return this.create({
      userId: creatorId,
      type: NotificationType.DEAL_PAID,
      title: '결제 완료',
      message: `"${title}" 광고비 ${amount.toLocaleString()}원이 에스크로에 입금되었습니다.`,
      targetType: 'deal',
      targetId: dealId,
      metadata: { amount },
    });
  }

  async notifyDealSubmitted(advertiserId: string, dealId: string, creatorName: string, title: string) {
    return this.create({
      userId: advertiserId,
      type: NotificationType.DEAL_SUBMITTED,
      title: '콘텐츠 제출됨',
      message: `${creatorName}님이 "${title}" 콘텐츠를 제출했습니다. 72시간 내 확인해주세요.`,
      targetType: 'deal',
      targetId: dealId,
    });
  }

  async notifyDealSettled(creatorId: string, dealId: string, amount: number, title: string) {
    return this.create({
      userId: creatorId,
      type: NotificationType.DEAL_SETTLED,
      title: '정산 완료',
      message: `"${title}" 광고비 ${amount.toLocaleString()}원이 정산되었습니다.`,
      targetType: 'deal',
      targetId: dealId,
      metadata: { amount },
    });
  }

  async notifyDealDeadline(userId: string, dealId: string, title: string, hoursLeft: number) {
    return this.create({
      userId,
      type: NotificationType.DEAL_DEADLINE,
      title: '기한 임박',
      message: `"${title}" 기한이 ${hoursLeft}시간 남았습니다.`,
      targetType: 'deal',
      targetId: dealId,
      metadata: { hoursLeft },
    });
  }

  async notifyWarning(userId: string, reason: string) {
    return this.create({
      userId,
      type: NotificationType.WARNING_RECEIVED,
      title: '경고 알림',
      message: `경고를 받았습니다: ${reason}`,
    });
  }

  async notifyWithdrawalComplete(userId: string, amount: number) {
    return this.create({
      userId,
      type: NotificationType.WITHDRAWAL_COMPLETE,
      title: '출금 완료',
      message: `${amount.toLocaleString()}원 출금이 완료되었습니다.`,
      metadata: { amount },
    });
  }
}
