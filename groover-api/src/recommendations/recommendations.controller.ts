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
import { CreateRecommendationDto } from './dto/create-recommendation.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('recommendations')
@UseGuards(JwtAuthGuard)
export class RecommendationsController {
  constructor(private readonly recommendationsService: RecommendationsService) {}

  /**
   * 추천 생성
   * POST /v1/recommendations
   */
  @Post()
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
