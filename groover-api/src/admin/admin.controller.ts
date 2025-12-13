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
  SuspendUserDto,
  WarnUserDto,
  ProcessReportDto,
} from './dto/admin.dto';

@ApiTags('Admin (관리자)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // ========================================
  // 플랫폼 통계
  // ========================================

  @Get('stats')
  @ApiOperation({ 
    summary: '플랫폼 전체 통계',
    description: '유저 수, 글 수 등 플랫폼 전체 통계를 조회합니다.'
  })
  async getPlatformStats() {
    return this.adminService.getPlatformStats();
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
  async getUserDetail(@Param('userId') userId: string) {
    return this.adminService.getUserDetail(userId);
  }

  @Post('users/:userId/suspend')
  @ApiOperation({ 
    summary: '유저 정지',
    description: '유저를 일정 기간 정지합니다.'
  })
  @ApiParam({ name: 'userId' })
  async suspendUser(
    @Param('userId') userId: string,
    @Body() dto: SuspendUserDto,
  ) {
    return this.adminService.suspendUser(userId, dto.days, dto.reason);
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
}