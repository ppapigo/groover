// src/admin/dto/admin.dto.ts

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsNumber, Min, Max } from 'class-validator';

// ========================================
// 플랫폼 통계
// ========================================

export class PlatformStatsDto {
  @ApiProperty({ description: '총 유저 수' })
  totalUsers: number;

  @ApiProperty({ description: '이번 달 신규 유저' })
  newUsersThisMonth: number;

  @ApiProperty({ description: '총 거래 수' })
  totalDeals: number;

  @ApiProperty({ description: '완료된 거래 수' })
  completedDeals: number;

  @ApiProperty({ description: '진행 중인 거래 수' })
  activeDeals: number;

  @ApiProperty({ description: '총 거래액 (원)' })
  totalTransactionVolume: number;

  @ApiProperty({ description: '총 플랫폼 수수료 (원)' })
  totalPlatformFees: number;

  @ApiProperty({ description: '이번 달 거래액 (원)' })
  monthlyTransactionVolume: number;

  @ApiProperty({ description: '이번 달 플랫폼 수수료 (원)' })
  monthlyPlatformFees: number;

  @ApiProperty({ description: '평균 거래 금액 (원)' })
  avgDealAmount: number;

  @ApiProperty({ description: '대기 중인 신고 수' })
  pendingReports: number;

  @ApiProperty({ description: '직거래 시도 횟수 (이번 달)' })
  directTradeAttempts: number;
}

export class DailyPlatformStatDto {
  @ApiProperty({ description: '날짜' })
  date: string;

  @ApiProperty({ description: '신규 유저' })
  newUsers: number;

  @ApiProperty({ description: '거래 수' })
  deals: number;

  @ApiProperty({ description: '거래액' })
  volume: number;

  @ApiProperty({ description: '수수료' })
  fees: number;
}

export class RevenueAnalyticsDto {
  @ApiProperty({ description: '일별 수익', type: [DailyPlatformStatDto] })
  daily: DailyPlatformStatDto[];

  @ApiProperty({ description: '총 수익' })
  totalRevenue: number;

  @ApiProperty({ description: '성장률 (%)' })
  growthRate: number;

  @ApiProperty({ description: '평균 일 수익' })
  avgDailyRevenue: number;
}

// ========================================
// 유저 관리
// ========================================

export class UserListItemDto {
  @ApiProperty({ description: '유저 ID' })
  id: string;

  @ApiProperty({ description: '이메일' })
  email: string;

  @ApiProperty({ description: '이름' })
  name: string | null;

  @ApiProperty({ description: '프로필 이미지' })
  profileImageUrl: string | null;

  @ApiProperty({ description: '경고 횟수' })
  warningCount: number;

  @ApiProperty({ description: '광고 매칭 정지 여부' })
  adMatchingSuspended: boolean;

  @ApiProperty({ description: '가입일' })
  createdAt: Date;

  @ApiProperty({ description: '총 수익 (크리에이터)' })
  totalEarnings: number;

  @ApiProperty({ description: '완료된 거래 수' })
  completedDeals: number;
}

export class UserDetailDto extends UserListItemDto {
  @ApiProperty({ description: '정지 해제일' })
  suspendedUntil: Date | null;

  @ApiProperty({ description: '지갑 잔액' })
  walletBalance: number;

  @ApiProperty({ description: '대기 잔액' })
  pendingBalance: number;

  @ApiProperty({ description: '경고 내역' })
  warnings: any[];

  @ApiProperty({ description: '직거래 시도 내역' })
  directTradeAttempts: any[];

  @ApiProperty({ description: '최근 거래' })
  recentDeals: any[];
}

export class SuspendUserDto {
  @ApiProperty({ description: '정지 기간 (일)', example: 7 })
  @IsNumber()
  @Min(1)
  @Max(365)
  days: number;

  @ApiProperty({ description: '정지 사유' })
  @IsString()
  reason: string;
}

export class WarnUserDto {
  @ApiProperty({ description: '경고 유형', enum: ['DIRECT_TRADE_ATTEMPT', 'SPAM', 'ABUSE', 'SCAM', 'OTHER'] })
  @IsEnum(['DIRECT_TRADE_ATTEMPT', 'SPAM', 'ABUSE', 'SCAM', 'OTHER'])
  type: string;

  @ApiProperty({ description: '경고 사유' })
  @IsString()
  reason: string;
}

// ========================================
// 신고 관리
// ========================================

export class ReportListItemDto {
  @ApiProperty({ description: '신고 ID' })
  id: string;

  @ApiProperty({ description: '신고자' })
  reporter: { id: string; name: string; email: string };

  @ApiProperty({ description: '피신고자' })
  reported: { id: string; name: string; email: string };

  @ApiProperty({ description: '신고 사유' })
  reason: string;

  @ApiProperty({ description: '상태', enum: ['PENDING', 'REVIEWED', 'RESOLVED', 'DISMISSED'] })
  status: string;

  @ApiProperty({ description: '신고일' })
  createdAt: Date;

  @ApiPropertyOptional({ description: '관련 메시지 내용' })
  messageContent?: string;
}

export class ProcessReportDto {
  @ApiProperty({ description: '처리 결과', enum: ['RESOLVED', 'DISMISSED'] })
  @IsEnum(['RESOLVED', 'DISMISSED'])
  status: string;

  @ApiPropertyOptional({ description: '처리 메모' })
  @IsString()
  @IsOptional()
  note?: string;

  @ApiPropertyOptional({ description: '피신고자 제재 여부' })
  @IsOptional()
  punishUser?: boolean;

  @ApiPropertyOptional({ description: '제재 기간 (일)' })
  @IsNumber()
  @IsOptional()
  suspendDays?: number;
}

// ========================================
// 거래 모니터링
// ========================================

export class DealMonitorItemDto {
  @ApiProperty({ description: '거래 ID' })
  id: string;

  @ApiProperty({ description: '광고주' })
  advertiser: { id: string; name: string; email: string };

  @ApiProperty({ description: '크리에이터' })
  creator: { id: string; name: string; email: string };

  @ApiProperty({ description: '제목' })
  title: string;

  @ApiProperty({ description: '금액' })
  totalAmount: number;

  @ApiProperty({ description: '플랫폼 수수료' })
  platformFee: number;

  @ApiProperty({ description: '상태' })
  status: string;

  @ApiProperty({ description: '생성일' })
  createdAt: Date;

  @ApiPropertyOptional({ description: '제출 기한' })
  submitDeadline?: Date;

  @ApiPropertyOptional({ description: '확인 기한' })
  confirmDeadline?: Date;
}

// ========================================
// 직거래 시도 로그
// ========================================

export class DirectTradeLogDto {
  @ApiProperty({ description: '로그 ID' })
  id: string;

  @ApiProperty({ description: '유저' })
  user: { id: string; name: string; email: string };

  @ApiProperty({ description: '원본 메시지' })
  originalContent: string;

  @ApiProperty({ description: '감지된 패턴' })
  detectedPatterns: string[];

  @ApiProperty({ description: '감지 유형' })
  detectedTypes: string[];

  @ApiProperty({ description: '발생 시간' })
  createdAt: Date;
}
