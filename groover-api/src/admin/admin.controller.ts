// src/admin/admin.controller.ts

import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from './guards/admin.guard';
import { AdminService } from './admin.service';
import {
  PlatformStatsDto,
  RevenueAnalyticsDto,
  UserListItemDto,
  UserDetailDto,
  SuspendUserDto,
  WarnUserDto,
  ReportListItemDto,
  ProcessReportDto,
  DealMonitorItemDto,
  DirectTradeLogDto,
} from './dto/admin.dto';

@ApiTags('Admin (관리자)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // ========================================
  // 플랫폼 통계/분석
  // ========================================

  @Get('stats')
  @ApiOperation({ 
    summary: '플랫폼 전체 통계',
    description: '유저 수, 거래 수, 매출, 수수료 등 플랫폼 전체 통계를 조회합니다.'
  })
  @ApiResponse({ status: 200, type: PlatformStatsDto })
  async getPlatformStats() {
    return this.adminService.getPlatformStats();
  }

  @Get('analytics/revenue')
  @ApiOperation({ 
    summary: '수익 분석',
    description: '일별 수익, 성장률 등 수익 분석 데이터를 조회합니다.'
  })
  @ApiQuery({ name: 'days', required: false, description: '조회 기간 (일)', example: 30 })
  @ApiResponse({ status: 200, type: RevenueAnalyticsDto })
  async getRevenueAnalytics(@Query('days') days?: string) {
    const daysNum = days ? parseInt(days, 10) : 30;
    return this.adminService.getRevenueAnalytics(daysNum);
  }

  @Get('analytics/deal-status')
  @ApiOperation({ summary: '거래 상태 분포' })
  async getDealStatusDistribution() {
    return this.adminService.getDealStatusDistribution();
  }

  @Get('analytics/top-creators')
  @ApiOperation({ summary: '탑 크리에이터' })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  async getTopCreators(@Query('limit') limit?: string) {
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return this.adminService.getTopCreators(limitNum);
  }

  @Get('analytics/top-advertisers')
  @ApiOperation({ summary: '탑 광고주' })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  async getTopAdvertisers(@Query('limit') limit?: string) {
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return this.adminService.getTopAdvertisers(limitNum);
  }

  // ========================================
  // 유저 관리
  // ========================================

  @Get('users')
  @ApiOperation({ 
    summary: '유저 목록',
    description: '전체 유저 목록을 조회합니다. 검색/필터 가능.'
  })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiQuery({ name: 'search', required: false, description: '이메일/이름 검색' })
  @ApiQuery({ name: 'filter', required: false, enum: ['all', 'suspended', 'warned'] })
  @ApiResponse({ status: 200, type: [UserListItemDto] })
  async getUsers(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('filter') filter?: 'all' | 'suspended' | 'warned',
  ) {
    return this.adminService.getUsers(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
      search,
      filter,
    );
  }

  @Get('users/:userId')
  @ApiOperation({ summary: '유저 상세 조회' })
  @ApiParam({ name: 'userId' })
  @ApiResponse({ status: 200, type: UserDetailDto })
  async getUserDetail(@Param('userId') userId: string) {
    return this.adminService.getUserDetail(userId);
  }

  @Post('users/:userId/suspend')
  @ApiOperation({ 
    summary: '유저 정지',
    description: '유저의 광고 매칭을 일정 기간 정지합니다.'
  })
  @ApiParam({ name: 'userId' })
  async suspendUser(
    @Param('userId') userId: string,
    @Body() dto: SuspendUserDto,
  ) {
    return this.adminService.suspendUser(userId, dto);
  }

  @Post('users/:userId/unsuspend')
  @ApiOperation({ summary: '유저 정지 해제' })
  @ApiParam({ name: 'userId' })
  async unsuspendUser(@Param('userId') userId: string) {
    return this.adminService.unsuspendUser(userId);
  }

  @Post('users/:userId/warn')
  @ApiOperation({ summary: '유저 경고' })
  @ApiParam({ name: 'userId' })
  async warnUser(
    @Param('userId') userId: string,
    @Body() dto: WarnUserDto,
  ) {
    return this.adminService.warnUser(userId, dto);
  }

  // ========================================
  // 신고 관리
  // ========================================

  @Get('reports')
  @ApiOperation({ 
    summary: '신고 목록',
    description: 'DM 신고 목록을 조회합니다.'
  })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiQuery({ name: 'status', required: false, enum: ['PENDING', 'REVIEWED', 'RESOLVED', 'DISMISSED'] })
  @ApiResponse({ status: 200, type: [ReportListItemDto] })
  async getReports(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
  ) {
    return this.adminService.getReports(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
      status,
    );
  }

  @Patch('reports/:reportId')
  @ApiOperation({ 
    summary: '신고 처리',
    description: '신고를 검토하고 처리합니다. 필요시 피신고자 제재.'
  })
  @ApiParam({ name: 'reportId' })
  async processReport(
    @Param('reportId') reportId: string,
    @Body() dto: ProcessReportDto,
  ) {
    return this.adminService.processReport(reportId, dto);
  }

  // ========================================
  // 거래 모니터링
  // ========================================

  @Get('deals')
  @ApiOperation({ 
    summary: '거래 모니터링',
    description: '모든 거래를 조회합니다. 기한 초과 거래 필터 가능.'
  })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'overdue', required: false, description: '기한 초과만', type: Boolean })
  @ApiResponse({ status: 200, type: [DealMonitorItemDto] })
  async getDeals(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('overdue') overdue?: string,
  ) {
    return this.adminService.getDeals(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
      status,
      overdue === 'true',
    );
  }

  // ========================================
  // 직거래 시도 로그
  // ========================================

  @Get('direct-trade-logs')
  @ApiOperation({ 
    summary: '직거래 시도 로그',
    description: '직거래 방지 시스템에 감지된 시도 목록을 조회합니다.'
  })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiResponse({ status: 200, type: [DirectTradeLogDto] })
  async getDirectTradeLogs(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.adminService.getDirectTradeLogs(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }
}
