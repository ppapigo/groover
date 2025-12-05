// src/dashboard/dashboard.controller.ts

import {
  Controller,
  Get,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DashboardService } from './dashboard.service';
import {
  CreatorStatsDto,
  AdvertiserStatsDto,
  StatsRangeDto,
  EarningsRangeDto,
  ActivityLogDto,
  DealPerformanceDto,
} from './dto/dashboard.dto';

@ApiTags('Dashboard (대시보드)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  // ========================================
  // 메인 대시보드
  // ========================================

  @Get('creator')
  @ApiOperation({ 
    summary: '크리에이터 대시보드',
    description: '크리에이터의 수익, 광고 현황, 조회수 등 종합 통계를 조회합니다.'
  })
  @ApiResponse({ status: 200, description: '조회 성공', type: CreatorStatsDto })
  async getCreatorStats(@Request() req) {
    return this.dashboardService.getCreatorStats(req.user.id);
  }

  @Get('advertiser')
  @ApiOperation({ 
    summary: '광고주 대시보드',
    description: '광고주의 광고비 지출, 진행 중인 광고 등 종합 통계를 조회합니다.'
  })
  @ApiResponse({ status: 200, description: '조회 성공', type: AdvertiserStatsDto })
  async getAdvertiserStats(@Request() req) {
    return this.dashboardService.getAdvertiserStats(req.user.id);
  }

  // ========================================
  // 상세 통계
  // ========================================

  @Get('stats')
  @ApiOperation({ 
    summary: '일별 통계 조회',
    description: '지정된 기간의 조회수, 클릭수 등 일별 통계를 조회합니다.'
  })
  @ApiQuery({ name: 'days', required: false, description: '조회 기간 (일)', example: 30 })
  @ApiResponse({ status: 200, description: '조회 성공', type: StatsRangeDto })
  async getStatsRange(
    @Request() req,
    @Query('days') days?: string,
  ) {
    const daysNum = days ? parseInt(days, 10) : 30;
    return this.dashboardService.getStatsRange(req.user.id, daysNum);
  }

  @Get('earnings')
  @ApiOperation({ 
    summary: '수익 통계 조회',
    description: '지정된 기간의 광고 수익, 파트너스 수익 등 수익 통계를 조회합니다.'
  })
  @ApiQuery({ name: 'days', required: false, description: '조회 기간 (일)', example: 30 })
  @ApiResponse({ status: 200, description: '조회 성공', type: EarningsRangeDto })
  async getEarningsRange(
    @Request() req,
    @Query('days') days?: string,
  ) {
    const daysNum = days ? parseInt(days, 10) : 30;
    return this.dashboardService.getEarningsRange(req.user.id, daysNum);
  }

  // ========================================
  // 활동 로그
  // ========================================

  @Get('activity')
  @ApiOperation({ 
    summary: '최근 활동 로그',
    description: '광고 제안, 결제, 정산, 출금 등 최근 활동을 조회합니다.'
  })
  @ApiQuery({ name: 'limit', required: false, description: '조회 개수', example: 20 })
  @ApiResponse({ status: 200, description: '조회 성공', type: [ActivityLogDto] })
  async getActivityLogs(
    @Request() req,
    @Query('limit') limit?: string,
  ) {
    const limitNum = limit ? parseInt(limit, 10) : 20;
    return this.dashboardService.getActivityLogs(req.user.id, limitNum);
  }

  // ========================================
  // 광고 성과
  // ========================================

  @Get('deals/creator')
  @ApiOperation({ 
    summary: '크리에이터 광고 성과',
    description: '크리에이터로서 받은 광고 목록과 성과를 조회합니다.'
  })
  @ApiQuery({ name: 'limit', required: false, description: '조회 개수', example: 10 })
  @ApiResponse({ status: 200, description: '조회 성공', type: [DealPerformanceDto] })
  async getCreatorDealPerformance(
    @Request() req,
    @Query('limit') limit?: string,
  ) {
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return this.dashboardService.getDealPerformance(req.user.id, 'creator', limitNum);
  }

  @Get('deals/advertiser')
  @ApiOperation({ 
    summary: '광고주 광고 성과',
    description: '광고주로서 보낸 광고 목록과 성과를 조회합니다.'
  })
  @ApiQuery({ name: 'limit', required: false, description: '조회 개수', example: 10 })
  @ApiResponse({ status: 200, description: '조회 성공', type: [DealPerformanceDto] })
  async getAdvertiserDealPerformance(
    @Request() req,
    @Query('limit') limit?: string,
  ) {
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return this.dashboardService.getDealPerformance(req.user.id, 'advertiser', limitNum);
  }
}
