// src/notification/dto/notification.dto.ts

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsEnum } from 'class-validator';

// 알림 타입
export enum NotificationType {
  DEAL_PROPOSED = 'DEAL_PROPOSED',
  DEAL_ACCEPTED = 'DEAL_ACCEPTED',
  DEAL_REJECTED = 'DEAL_REJECTED',
  DEAL_PAID = 'DEAL_PAID',
  DEAL_SUBMITTED = 'DEAL_SUBMITTED',
  DEAL_CONFIRMED = 'DEAL_CONFIRMED',
  DEAL_SETTLED = 'DEAL_SETTLED',
  DEAL_DEADLINE = 'DEAL_DEADLINE',
  NEW_MESSAGE = 'NEW_MESSAGE',
  SYSTEM_NOTICE = 'SYSTEM_NOTICE',
  WARNING_RECEIVED = 'WARNING_RECEIVED',
  SUSPENSION_NOTICE = 'SUSPENSION_NOTICE',
  WITHDRAWAL_COMPLETE = 'WITHDRAWAL_COMPLETE',
}

// 푸시 우선순위 (중요한 것만 푸시)
export const PUSH_PRIORITY: Record<NotificationType, boolean> = {
  [NotificationType.DEAL_PROPOSED]: true,      // 푸시 O
  [NotificationType.DEAL_ACCEPTED]: true,      // 푸시 O
  [NotificationType.DEAL_REJECTED]: true,      // 푸시 O
  [NotificationType.DEAL_PAID]: true,          // 푸시 O
  [NotificationType.DEAL_SUBMITTED]: true,     // 푸시 O
  [NotificationType.DEAL_CONFIRMED]: true,     // 푸시 O
  [NotificationType.DEAL_SETTLED]: true,       // 푸시 O
  [NotificationType.DEAL_DEADLINE]: true,      // 푸시 O
  [NotificationType.NEW_MESSAGE]: false,       // 푸시 X (인앱만)
  [NotificationType.SYSTEM_NOTICE]: false,     // 푸시 X
  [NotificationType.WARNING_RECEIVED]: true,   // 푸시 O
  [NotificationType.SUSPENSION_NOTICE]: true,  // 푸시 O
  [NotificationType.WITHDRAWAL_COMPLETE]: true,// 푸시 O
};

// ========================================
// 요청 DTO
// ========================================

export class RegisterPushTokenDto {
  @ApiProperty({ description: 'FCM 토큰' })
  @IsString()
  token: string;

  @ApiProperty({ description: '플랫폼', enum: ['ios', 'android', 'web'] })
  @IsEnum(['ios', 'android', 'web'])
  platform: string;

  @ApiPropertyOptional({ description: '디바이스 ID' })
  @IsString()
  @IsOptional()
  deviceId?: string;
}

export class MarkReadDto {
  @ApiPropertyOptional({ description: '알림 ID (없으면 전체 읽음)' })
  @IsString()
  @IsOptional()
  notificationId?: string;
}

// ========================================
// 응답 DTO
// ========================================

export class NotificationResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ enum: NotificationType })
  type: NotificationType;

  @ApiProperty()
  title: string;

  @ApiProperty()
  message: string;

  @ApiPropertyOptional()
  targetType?: string;

  @ApiPropertyOptional()
  targetId?: string;

  @ApiPropertyOptional()
  metadata?: any;

  @ApiProperty()
  isRead: boolean;

  @ApiProperty()
  createdAt: Date;
}

export class NotificationListResponseDto {
  @ApiProperty({ type: [NotificationResponseDto] })
  items: NotificationResponseDto[];

  @ApiProperty()
  unreadCount: number;

  @ApiProperty()
  hasMore: boolean;

  @ApiPropertyOptional()
  nextCursor?: string;
}

export class UnreadCountResponseDto {
  @ApiProperty()
  count: number;
}
