// src/notification/notification.controller.ts

import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Query,
  Param,
  UseGuards,
  Request,
  Sse,
  Res,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { Response } from 'express';
import { Observable, interval, map } from 'rxjs';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { NotificationService } from './notification.service';
import { NotificationSseService } from './notification.sse';
import {
  RegisterPushTokenDto,
  MarkReadDto,
  NotificationListResponseDto,
  UnreadCountResponseDto,
} from './dto/notification.dto';

@ApiTags('Notification (알림)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationController {
  constructor(
    private readonly notificationService: NotificationService,
    private readonly sseService: NotificationSseService,
  ) {}

  // ========================================
  // 알림 조회
  // ========================================

  @Get()
  @ApiOperation({ 
    summary: '알림 목록',
    description: '내 알림 목록을 조회합니다.'
  })
  @ApiQuery({ name: 'cursor', required: false })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiResponse({ status: 200, type: NotificationListResponseDto })
  async getNotifications(
    @Request() req,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    return this.notificationService.getNotifications(
      req.user.id,
      cursor,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  @Get('unread-count')
  @ApiOperation({ summary: '안읽은 알림 개수' })
  @ApiResponse({ status: 200, type: UnreadCountResponseDto })
  async getUnreadCount(@Request() req) {
    const count = await this.notificationService.getUnreadCount(req.user.id);
    return { count };
  }

  // ========================================
  // 읽음 처리
  // ========================================

  @Post('read')
  @ApiOperation({ 
    summary: '읽음 처리',
    description: 'notificationId 없으면 전체 읽음 처리'
  })
  async markAsRead(@Request() req, @Body() dto: MarkReadDto) {
    const result = await this.notificationService.markAsRead(req.user.id, dto.notificationId);
    
    // SSE로 클라이언트에 알림
    this.sseService.emitRead(req.user.id, dto.notificationId);
    
    return result;
  }

  @Post(':id/read')
  @ApiOperation({ summary: '단일 알림 읽음 처리' })
  async markOneAsRead(@Request() req, @Param('id') id: string) {
    const result = await this.notificationService.markAsRead(req.user.id, id);
    this.sseService.emitRead(req.user.id, id);
    return result;
  }

  // ========================================
  // 푸시 토큰 관리
  // ========================================

  @Post('push-token')
  @ApiOperation({ 
    summary: '푸시 토큰 등록',
    description: 'FCM 푸시 알림을 받기 위한 토큰 등록'
  })
  async registerPushToken(@Request() req, @Body() dto: RegisterPushTokenDto) {
    return this.notificationService.registerPushToken(
      req.user.id,
      dto.token,
      dto.platform,
      dto.deviceId,
    );
  }

  @Delete('push-token/:token')
  @ApiOperation({ summary: '푸시 토큰 삭제' })
  async removePushToken(@Param('token') token: string) {
    return this.notificationService.removePushToken(token);
  }

  // ========================================
  // SSE (실시간 알림)
  // ========================================

  @Sse('stream')
  @ApiOperation({ 
    summary: '실시간 알림 스트림 (SSE)',
    description: 'Server-Sent Events로 실시간 알림을 받습니다.'
  })
  stream(@Request() req, @Res() res: Response): Observable<MessageEvent> {
    const userId = req.user.id;

    // 연결 종료 시 정리
    res.on('close', () => {
      this.sseService.unsubscribe(userId);
    });

    // SSE 스트림 반환
    return this.sseService.subscribe(userId);
  }

  // Heartbeat (연결 유지용)
  @Sse('heartbeat')
  @ApiOperation({ summary: 'SSE 연결 상태 확인용 heartbeat' })
  heartbeat(): Observable<MessageEvent> {
    return interval(30000).pipe(
      map(() => ({
        data: JSON.stringify({ type: 'heartbeat', timestamp: new Date().toISOString() }),
      } as MessageEvent)),
    );
  }
}
