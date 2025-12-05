// src/notification/notification.queue.ts
// BullMQ를 사용한 비동기 알림 처리

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Queue, Worker, Job } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import { NotificationService } from './notification.service';
import { NotificationType } from './dto/notification.dto';

// 큐에 넣을 알림 데이터
export interface NotificationJobData {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  targetType?: string;
  targetId?: string;
  metadata?: any;
}

// 기한 체크 Job 데이터
export interface DeadlineCheckJobData {
  dealId: string;
  userId: string;
  title: string;
  deadlineType: 'submit' | 'confirm';
}

@Injectable()
export class NotificationQueueService implements OnModuleInit {
  private readonly logger = new Logger(NotificationQueueService.name);
  
  private notificationQueue: Queue;
  private deadlineQueue: Queue;
  private worker: Worker;
  private deadlineWorker: Worker;

  constructor(
    private readonly configService: ConfigService,
    private readonly notificationService: NotificationService,
  ) {}

  async onModuleInit() {
    const redisConfig = {
      host: this.configService.get('REDIS_HOST') || 'localhost',
      port: this.configService.get('REDIS_PORT') || 6379,
    };

    // 알림 큐 생성
    this.notificationQueue = new Queue('notifications', {
      connection: redisConfig,
      defaultJobOptions: {
        removeOnComplete: 100,
        removeOnFail: 50,
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
      },
    });

    // 기한 체크 큐 (지연 작업용)
    this.deadlineQueue = new Queue('deadline-checks', {
      connection: redisConfig,
      defaultJobOptions: {
        removeOnComplete: 100,
        removeOnFail: 50,
      },
    });

    // 워커 시작
    this.startWorkers(redisConfig);
    
    this.logger.log('알림 큐 초기화 완료');
  }

  private startWorkers(redisConfig: any) {
    // 알림 워커
    this.worker = new Worker(
      'notifications',
      async (job: Job<NotificationJobData>) => {
        await this.processNotification(job.data);
      },
      { connection: redisConfig, concurrency: 5 },
    );

    this.worker.on('completed', (job) => {
      this.logger.debug(`알림 Job 완료: ${job.id}`);
    });

    this.worker.on('failed', (job, err) => {
      this.logger.error(`알림 Job 실패: ${job?.id}`, err);
    });

    // 기한 체크 워커
    this.deadlineWorker = new Worker(
      'deadline-checks',
      async (job: Job<DeadlineCheckJobData>) => {
        await this.processDeadlineCheck(job.data);
      },
      { connection: redisConfig, concurrency: 3 },
    );
  }

  // ========================================
  // 알림 Job 추가 (비동기)
  // ========================================

  async addNotification(data: NotificationJobData) {
    await this.notificationQueue.add('send-notification', data);
  }

  // 대량 알림 (예: 공지사항)
  async addBulkNotifications(userIds: string[], type: NotificationType, title: string, message: string) {
    const jobs = userIds.map(userId => ({
      name: 'send-notification',
      data: { userId, type, title, message },
    }));
    
    await this.notificationQueue.addBulk(jobs);
    this.logger.log(`대량 알림 추가: ${userIds.length}건`);
  }

  // ========================================
  // 기한 알림 스케줄
  // ========================================

  async scheduleDeadlineReminder(
    dealId: string,
    userId: string,
    title: string,
    deadlineType: 'submit' | 'confirm',
    delayMs: number,
  ) {
    await this.deadlineQueue.add(
      'deadline-reminder',
      { dealId, userId, title, deadlineType },
      { delay: delayMs },
    );
    
    this.logger.log(`기한 알림 예약: dealId=${dealId}, delay=${delayMs}ms`);
  }

  // 제출 기한 24시간 전 알림
  async scheduleSubmitDeadlineReminder(dealId: string, creatorId: string, title: string, deadline: Date) {
    const now = new Date();
    const reminderTime = new Date(deadline.getTime() - 24 * 60 * 60 * 1000); // 24시간 전
    
    if (reminderTime > now) {
      const delay = reminderTime.getTime() - now.getTime();
      await this.scheduleDeadlineReminder(dealId, creatorId, title, 'submit', delay);
    }
  }

  // 확인 기한 12시간 전 알림
  async scheduleConfirmDeadlineReminder(dealId: string, advertiserId: string, title: string, deadline: Date) {
    const now = new Date();
    const reminderTime = new Date(deadline.getTime() - 12 * 60 * 60 * 1000); // 12시간 전
    
    if (reminderTime > now) {
      const delay = reminderTime.getTime() - now.getTime();
      await this.scheduleDeadlineReminder(dealId, advertiserId, title, 'confirm', delay);
    }
  }

  // ========================================
  // Job 처리
  // ========================================

  private async processNotification(data: NotificationJobData) {
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
    } catch (error) {
      this.logger.error('알림 처리 실패:', error);
      throw error; // 재시도 트리거
    }
  }

  private async processDeadlineCheck(data: DeadlineCheckJobData) {
    try {
      const hoursLeft = data.deadlineType === 'submit' ? 24 : 12;
      
      await this.notificationService.notifyDealDeadline(
        data.userId,
        data.dealId,
        data.title,
        hoursLeft,
      );
    } catch (error) {
      this.logger.error('기한 알림 처리 실패:', error);
      throw error;
    }
  }

  // ========================================
  // 큐 상태 조회 (관리자용)
  // ========================================

  async getQueueStats() {
    const [waiting, active, completed, failed] = await Promise.all([
      this.notificationQueue.getWaitingCount(),
      this.notificationQueue.getActiveCount(),
      this.notificationQueue.getCompletedCount(),
      this.notificationQueue.getFailedCount(),
    ]);

    return { waiting, active, completed, failed };
  }
}
