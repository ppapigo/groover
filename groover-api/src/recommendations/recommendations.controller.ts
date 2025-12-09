// src/recommendations/recommendations.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { RecommendationsService } from './recommendations.service';
import { ChatbotService } from './chatbot.service';
import { CreateRecommendationDto } from './dto/create-recommendation.dto';
import { ChatRequestDto } from './dto/chat.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('recommendations')
export class RecommendationsController {
  constructor(
    private readonly recommendationsService: RecommendationsService,
    private readonly chatbotService: ChatbotService,
  ) {}

  /**
   * 챗봇 대화 (인증 불필요)
   * POST /v1/recommendations/chat
   */
  @Post('chat')
  @HttpCode(HttpStatus.OK)
  async chat(@Body() dto: ChatRequestDto) {
    const response = await this.chatbotService.chat(dto.message, dto.history);

    return {
      success: true,
      data: {
        message: response,
      },
    };
  }

  /**
   * 추천 생성
   * POST /v1/recommendations
   */
  @Post()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async create(@Request() req, @Body() dto: CreateRecommendationDto) {
    const result = await this.recommendationsService.createRecommendation(
      req.user.id,
      dto,
    );

    return {
      success: true,
      message: 'Recommendation generated successfully',
      data: result,
    };
  }

  /**
   * 추천 결과 조회
   * GET /v1/recommendations/:id
   */
  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const result = await this.recommendationsService.getRecommendation(id);
    return {
      success: true,
      data: result,
    };
  }

  /**
   * 내 추천 기록 조회
   * GET /v1/recommendations/history
   */
  @Get()
  @UseGuards(JwtAuthGuard)
  async getHistory(
    @Request() req,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const result = await this.recommendationsService.getHistory(
      req.user.id,
      page || 1,
      limit || 10,
    );

    return {
      success: true,
      ...result,
    };
  }
}
