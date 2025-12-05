// src/notification/notification.sse.ts
// Server-Sent Events (SSE) - 실시간 알림

import { Injectable, Logger } from '@nestjs/common';
import { Subject, Observable, filter, map } from 'rxjs';

interface NotificationEvent {
  userId: string;
  type: string;
  data: any;
}

@Injectable()
export class NotificationSseService {
  private readonly logger = new Logger(NotificationSseService.name);
  
  // 이벤트 스트림
  private events$ = new Subject<NotificationEvent>();
  
  // 연결된 클라이언트 수 (모니터링용)
  private connections = new Map<string, number>();

  // ========================================
  // 클라이언트 연결 (구독)
  // ========================================

  subscribe(userId: string): Observable<MessageEvent> {
    // 연결 수 증가
    const count = (this.connections.get(userId) || 0) + 1;
    this.connections.set(userId, count);
    
    this.logger.log(`SSE 연결: userId=${userId}, connections=${count}`);

    // 해당 유저의 이벤트만 필터링
    return this.events$.pipe(
      filter(event => event.userId === userId),
      map(event => ({
        data: JSON.stringify({
          type: event.type,
          ...event.data,
          timestamp: new Date().toISOString(),
        }),
      } as MessageEvent)),
    );
  }

  // 연결 종료
  unsubscribe(userId: string) {
    const count = (this.connections.get(userId) || 1) - 1;
    if (count <= 0) {
      this.connections.delete(userId);
    } else {
      this.connections.set(userId, count);
    }
    
    this.logger.log(`SSE 연결 해제: userId=${userId}, remaining=${count}`);
  }

  // ========================================
  // 이벤트 발송
  // ========================================

  // 새 알림
  emitNewNotification(userId: string, notification: any) {
    this.events$.next({
      userId,
      type: 'notification',
      data: {
        id: notification.id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        targetType: notification.targetType,
        targetId: notification.targetId,
      },
    });
  }

  // 안읽은 개수 업데이트
  emitUnreadCount(userId: string, count: number) {
    this.events$.next({
      userId,
      type: 'unread_count',
      data: { count },
    });
  }

  // 읽음 처리됨
  emitRead(userId: string, notificationId?: string) {
    this.events$.next({
      userId,
      type: 'read',
      data: { notificationId, all: !notificationId },
    });
  }

  // ========================================
  // 모니터링
  // ========================================

  getConnectionStats() {
    let totalConnections = 0;
    this.connections.forEach(count => {
      totalConnections += count;
    });

    return {
      uniqueUsers: this.connections.size,
      totalConnections,
    };
  }
}
