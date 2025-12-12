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
  // 알림 생성
  // ========================================

  async create(params: CreateNotificationParams) {
    const { userId, type, title, message, targetType, targetId, metadata } = params;

    try {
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
      await this.prisma.notification.updateMany({
        where: { id: notificationId, userId },
        data: { isRead: true, readAt: new Date() },
      });
    } else {
      await this.prisma.notification.updateMany({
        where: { userId, isRead: false },
        data: { isRead: true, readAt: new Date() },
      });
    }

    return { success: true };
  }

  // ========================================
  // 읽지않은 개수
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
    if (deviceId) {
      await this.prisma.pushToken.updateMany({
        where: { userId, deviceId },
        data: { isActive: false },
      });
    }

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
      const tokens = await this.prisma.pushToken.findMany({
        where: { userId, isActive: true },
        select: { token: true, platform: true },
      });

      if (tokens.length === 0) {
        return;
      }

      // FCM 발송 (실제 구현 필요)
      // await this.fcmService.sendMulticast(tokens, title, message);

      this.logger.log(`푸시 발송: userId=${userId}, tokens=${tokens.length}`);
    } catch (error) {
      this.logger.error('푸시 발송 실패:', error);
    }
  }

  // ========================================
  // 커뮤니티 알림 메서드
  // ========================================

  async notifyNewFollower(userId: string, followerName: string, followerId: string) {
    return this.create({
      userId,
      type: NotificationType.NEW_FOLLOWER,
      title: '새로운 팔로워',
      message: `${followerName}님이 회원님을 팔로우합니다.`,
      targetType: 'user',
      targetId: followerId,
    });
  }

  async notifyPostLike(userId: string, likerName: string, postId: string, postTitle: string) {
    return this.create({
      userId,
      type: NotificationType.POST_LIKE,
      title: '게시글 좋아요',
      message: `${likerName}님이 "${postTitle}" 게시글을 좋아합니다.`,
      targetType: 'post',
      targetId: postId,
    });
  }

  async notifyNewComment(userId: string, commenterName: string, postId: string, postTitle: string) {
    return this.create({
      userId,
      type: NotificationType.NEW_COMMENT,
      title: '새 댓글',
      message: `${commenterName}님이 "${postTitle}"에 댓글을 남겼습니다.`,
      targetType: 'post',
      targetId: postId,
    });
  }

  async notifyCommentReply(userId: string, replierName: string, postId: string) {
    return this.create({
      userId,
      type: NotificationType.COMMENT_REPLY,
      title: '답글 알림',
      message: `${replierName}님이 회원님의 댓글에 답글을 남겼습니다.`,
      targetType: 'post',
      targetId: postId,
    });
  }

  async notifyNewMessage(userId: string, senderName: string, roomId: string) {
    return this.create({
      userId,
      type: NotificationType.NEW_MESSAGE,
      title: '새 메시지',
      message: `${senderName}님이 메시지를 보냈습니다.`,
      targetType: 'dm',
      targetId: roomId,
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
}