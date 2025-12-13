// src/notification/dto/notification.dto.ts

import { IsString, IsOptional, IsEnum } from 'class-validator';

// 알림 타입 - Prisma enum과 일치
export enum NotificationType {
  NEW_FOLLOWER = 'NEW_FOLLOWER',
  POST_LIKED = 'POST_LIKED',
  POST_COMMENTED = 'POST_COMMENTED',
  DISCUSSION_REPLY = 'DISCUSSION_REPLY',
  NEW_MESSAGE = 'NEW_MESSAGE',
  TAG_NEW_POST = 'TAG_NEW_POST',
  SYSTEM_NOTICE = 'SYSTEM_NOTICE',
  WARNING_RECEIVED = 'WARNING_RECEIVED',
}

// 푸시 우선순위
export const PUSH_PRIORITY: Record<NotificationType, boolean> = {
  [NotificationType.NEW_FOLLOWER]: false,
  [NotificationType.POST_LIKED]: false,
  [NotificationType.POST_COMMENTED]: true,
  [NotificationType.DISCUSSION_REPLY]: true,
  [NotificationType.NEW_MESSAGE]: true,
  [NotificationType.TAG_NEW_POST]: false,
  [NotificationType.SYSTEM_NOTICE]: false,
  [NotificationType.WARNING_RECEIVED]: true,
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