// src/notification/dto/notification.dto.ts

import { IsString, IsOptional, IsEnum } from 'class-validator';

// 알림 타입
export enum NotificationType {
  NEW_FOLLOWER = 'NEW_FOLLOWER',
  POST_LIKE = 'POST_LIKE',
  NEW_COMMENT = 'NEW_COMMENT',
  COMMENT_REPLY = 'COMMENT_REPLY',
  NEW_MESSAGE = 'NEW_MESSAGE',
  SYSTEM_NOTICE = 'SYSTEM_NOTICE',
  WARNING_RECEIVED = 'WARNING_RECEIVED',
  SUSPENSION_NOTICE = 'SUSPENSION_NOTICE',
}

// 푸시 우선순위
export const PUSH_PRIORITY: Record<NotificationType, boolean> = {
  [NotificationType.NEW_FOLLOWER]: false,
  [NotificationType.POST_LIKE]: false,
  [NotificationType.NEW_COMMENT]: true,
  [NotificationType.COMMENT_REPLY]: true,
  [NotificationType.NEW_MESSAGE]: false,
  [NotificationType.SYSTEM_NOTICE]: false,
  [NotificationType.WARNING_RECEIVED]: true,
  [NotificationType.SUSPENSION_NOTICE]: true,
};

// ========================================
// 요청 DTO
// ========================================

export class RegisterPushTokenDto {
  @IsString()
  token: string;

  @IsEnum(['ios', 'android', 'web'])
  platform: string;

  @IsString()
  @IsOptional()
  deviceId?: string;
}

export class MarkReadDto {
  @IsString()
  @IsOptional()
  notificationId?: string;
}

// ========================================
// 응답 DTO
// ========================================

export class NotificationResponseDto {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  targetType?: string;
  targetId?: string;
  metadata?: any;
  isRead: boolean;
  createdAt: Date;
}

export class NotificationListResponseDto {
  items: NotificationResponseDto[];
  unreadCount: number;
  hasMore: boolean;
  nextCursor?: string;
}

export class UnreadCountResponseDto {
  count: number;
}