// src/notification/notification.queue.ts
// 간단한 알림 큐 서비스 (Redis/BullMQ 없이)

import { Injectable, Logger } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { NotificationType } from './dto/notification.dto';

// 알림 데이터 인터페이스
export interface NotificationJobData {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  targetType?: string;
  targetId?: string;
  metadata?: any;
}

@Injectable()
export class NotificationQueueService {
  private readonly logger = new Logger(NotificationQueueService.name);

  constructor(
    private readonly notificationService: NotificationService,
  ) {}

  // ========================================
  // 알림 추가 (동기 처리)
  // ========================================

  async addNotification(data: NotificationJobData) {
    try {
      await this.notificationService.create({
        userId: data.userId,
        type: data.type,
        title: data.title,
        message: data.message,
        targetType: data.targetType,
        targetId: data.targetId,
        metadata: data.metadata,
      });
      this.logger.log(`알림 생성 완료: userId=${data.userId}, type=${data.type}`);
    } catch (error) {
      this.logger.error('알림 생성 실패:', error);
    }
  }

  // 대량 알림
  async addBulkNotifications(
    userIds: string[], 
    type: NotificationType, 
    title: string, 
    message: string
  ) {
    for (const userId of userIds) {
      await this.addNotification({ userId, type, title, message });
    }
    this.logger.log(`대량 알림 완료: ${userIds.length}건`);
  }

  // ========================================
  // 큐 상태 (더미)
  // ========================================

  async getQueueStats() {
    return { 
      waiting: 0, 
      active: 0, 
      completed: 0, 
      failed: 0,
      message: 'Redis 큐 비활성화 상태',
    };
  }
}