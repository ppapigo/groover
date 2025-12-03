// src/dm/dm.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DmService } from './dm.service';
import { DmBlockService } from './services/dm-block.service';
import { DmReportService } from './services/dm-report.service';
import { DmSearchService } from './services/dm-search.service';
import {
  SendMessageDto,
  StartThreadDto,
  ThreadQueryDto,
  MessageQueryDto,
  BlockUserDto,
  ReportMessageDto,
  SearchMessagesDto,
} from './dto';

@Controller('dm')
@UseGuards(JwtAuthGuard)
export class DmController {
  constructor(
    private readonly dmService: DmService,
    private readonly blockService: DmBlockService,
    private readonly reportService: DmReportService,
    private readonly searchService: DmSearchService,
  ) {}

  // ========================================
  // 스레드 관리
  // ========================================

  /**
   * DM 시작 (스레드 생성/조회)
   * POST /v1/dm/start
   */
  @Post('start')
  @Throttle({ default: { ttl: 1000, limit: 5 } })
  async startThread(
    @Req() req: any,
    @Body() dto: StartThreadDto,
  ) {
    const thread = await this.dmService.startThread(req.user.id, dto.targetUserId);

    // 초기 메시지가 있으면 전송
    if (dto.initialMessage) {
      await this.dmService.sendMessage(req.user.id, thread.id, {
        content: dto.initialMessage,
      });
    }

    return {
      success: true,
      data: thread,
    };
  }

  /**
   * 내 DM 목록
   * GET /v1/dm/threads
   */
  @Get('threads')
  async getThreads(
    @Req() req: any,
    @Query() query: ThreadQueryDto,
  ) {
    const result = await this.dmService.getThreads(
      req.user.id,
      query.cursor,
      query.limit,
    );

    return {
      success: true,
      data: result,
    };
  }

  /**
   * 스레드 상세
   * GET /v1/dm/threads/:id
   */
  @Get('threads/:id')
  async getThread(
    @Req() req: any,
    @Param('id', ParseUUIDPipe) threadId: string,
  ) {
    const thread = await this.dmService.getThread(req.user.id, threadId);

    return {
      success: true,
      data: thread,
    };
  }

  /**
   * 안읽음 카운트
   * GET /v1/dm/unread-count
   */
  @Get('unread-count')
  async getUnreadCount(@Req() req: any) {
    const count = await this.dmService.getUnreadCount(req.user.id);

    return {
      success: true,
      data: { count },
    };
  }

  // ========================================
  // 메시지 관리
  // ========================================

  /**
   * 메시지 전송
   * POST /v1/dm/threads/:id/messages
   */
  @Post('threads/:id/messages')
  @Throttle({ default: { ttl: 1000, limit: 3 } }) // 1초에 3개 제한
  async sendMessage(
    @Req() req: any,
    @Param('id', ParseUUIDPipe) threadId: string,
    @Body() dto: SendMessageDto,
  ) {
    const message = await this.dmService.sendMessage(req.user.id, threadId, dto);

    return {
      success: true,
      data: message,
    };
  }

  /**
   * 메시지 목록 조회
   * GET /v1/dm/threads/:id/messages
   */
  @Get('threads/:id/messages')
  async getMessages(
    @Req() req: any,
    @Param('id', ParseUUIDPipe) threadId: string,
    @Query() query: MessageQueryDto,
  ) {
    const result = await this.dmService.getMessages(
      req.user.id,
      threadId,
      query.cursor,
      query.limit,
    );

    return {
      success: true,
      data: result,
    };
  }

  /**
   * 읽음 처리
   * POST /v1/dm/threads/:id/read
   */
  @Post('threads/:id/read')
  @HttpCode(HttpStatus.OK)
  async markAsRead(
    @Req() req: any,
    @Param('id', ParseUUIDPipe) threadId: string,
  ) {
    await this.dmService.markAsRead(req.user.id, threadId);

    return {
      success: true,
      message: '읽음 처리되었습니다.',
    };
  }

  // ========================================
  // 차단
  // ========================================

  /**
   * 사용자 차단
   * POST /v1/dm/block
   */
  @Post('block')
  @Throttle({ default: { ttl: 30000, limit: 1 } }) // 30초에 1회
  async blockUser(
    @Req() req: any,
    @Body() dto: BlockUserDto,
  ) {
    await this.blockService.blockUser(req.user.id, dto.targetUserId);

    return {
      success: true,
      message: '사용자를 차단했습니다.',
    };
  }

  /**
   * 차단 해제
   * POST /v1/dm/unblock
   */
  @Post('unblock')
  @Throttle({ default: { ttl: 30000, limit: 1 } })
  async unblockUser(
    @Req() req: any,
    @Body() dto: BlockUserDto,
  ) {
    await this.blockService.unblockUser(req.user.id, dto.targetUserId);

    return {
      success: true,
      message: '차단을 해제했습니다.',
    };
  }

  /**
   * 차단 목록
   * GET /v1/dm/blocks
   */
  @Get('blocks')
  async getBlockedUsers(@Req() req: any) {
    const blocks = await this.blockService.getBlockedUsers(req.user.id);

    return {
      success: true,
      data: blocks,
    };
  }

  // ========================================
  // 신고
  // ========================================

  /**
   * 신고하기
   * POST /v1/dm/report
   */
  @Post('report')
  @Throttle({ default: { ttl: 30000, limit: 1 } }) // 30초에 1회
  async reportUser(
    @Req() req: any,
    @Body() dto: ReportMessageDto,
  ) {
    await this.reportService.reportUser(req.user.id, dto);

    return {
      success: true,
      message: '신고가 접수되었습니다.',
    };
  }

  // ========================================
  // 검색
  // ========================================

  /**
   * 메시지 검색
   * GET /v1/dm/search
   */
  @Get('search')
  async searchMessages(
    @Req() req: any,
    @Query() query: SearchMessagesDto,
  ) {
    const result = await this.searchService.searchMessages(req.user.id, query);

    return {
      success: true,
      data: result,
    };
  }
}
