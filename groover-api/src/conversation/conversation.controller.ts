// src/conversation/conversation.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ConversationService } from './conversation.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SendMessageDto } from './dto/send-message.dto';

@Controller('conversations')
@UseGuards(JwtAuthGuard)
export class ConversationController {
  constructor(private readonly conversationService: ConversationService) {}

  /**
   * 새 대화 시작
   * POST /v1/conversations
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async startConversation(@Request() req) {
    const result = await this.conversationService.startConversation(req.user.id);
    return {
      success: true,
      data: result,
    };
  }

  /**
   * 메시지 전송
   * POST /v1/conversations/:id/messages
   */
  @Post(':id/messages')
  @HttpCode(HttpStatus.OK)
  async sendMessage(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req,
    @Body() dto: SendMessageDto,
  ) {
    const result = await this.conversationService.processMessage(
      id,
      req.user.id,
      dto,
    );
    return {
      success: true,
      data: result,
    };
  }

  /**
   * 대화 기록 조회
   * GET /v1/conversations/:id
   */
  @Get(':id')
  async getConversation(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req,
  ) {
    const result = await this.conversationService.getConversationHistory(
      id,
      req.user.id,
    );
    return {
      success: true,
      data: result,
    };
  }

  /**
   * 내 대화 목록 조회
   * GET /v1/conversations
   */
  @Get()
  async getConversations(@Request() req) {
    const result = await this.conversationService.getConversations(req.user.id);
    return {
      success: true,
      data: result,
    };
  }
}
