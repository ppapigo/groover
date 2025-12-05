// src/dashboard/dto/dashboard.dto.ts

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ========================================
// 크리에이터 대시보드
// ========================================

export class CreatorStatsDto {
  @ApiProperty({ description: '총 수익 (원)' })
  totalEarnings: number;

  @ApiProperty({ description: '이번 달 수익 (원)' })
  monthlyEarnings: number;

  @ApiProperty({ description: '대기 중인 정산 (원)' })
  pendingBalance: number;

  @ApiProperty({ description: '출금 가능 잔액 (원)' })
  availableBalance: number;

  @ApiProperty({ description: '완료된 광고 수' })
  completedDeals: number;

  @ApiProperty({ description: '진행 중인 광고 수' })
  activeDeals: number;

  @ApiProperty({ description: '대기 중인 제안 수' })
  pendingProposals: number;

  @ApiProperty({ description: '이번 달 포스트 조회수' })
  monthlyPostViews: number;

  @ApiProperty({ description: '이번 달 파트너스 클릭수' })
  monthlyPartnerClicks: number;
}

// ========================================
// 광고주 대시보드
// ========================================

export class AdvertiserStatsDto {
  @ApiProperty({ description: '총 광고비 지출 (원)' })
  totalSpent: number;

  @ApiProperty({ description: '이번 달 지출 (원)' })
  monthlySpent: number;

  @ApiProperty({ description: '진행 중인 광고 수' })
  activeDeals: number;

  @ApiProperty({ description: '완료된 광고 수' })
  completedDeals: number;

  @ApiProperty({ description: '대기 중인 제안 수' })
  pendingProposals: number;

  @ApiProperty({ description: '확인 대기 중인 콘텐츠 수' })
  pendingConfirmation: number;
}

// ========================================
// 일별 통계
// ========================================

export class DailyStatDto {
  @ApiProperty({ description: '날짜' })
  date: string;

  @ApiProperty({ description: '페이지 조회수' })
  pageViews: number;

  @ApiProperty({ description: '포스트 조회수' })
  postViews: number;

  @ApiProperty({ description: '광고 노출수' })
  adImpressions: number;

  @ApiProperty({ description: '광고 클릭수' })
  adClicks: number;

  @ApiProperty({ description: '파트너스 클릭수' })
  partnerClicks: number;
}

export class StatsRangeDto {
  @ApiProperty({ description: '일별 통계', type: [DailyStatDto] })
  daily: DailyStatDto[];

  @ApiProperty({ description: '총 조회수' })
  totalViews: number;

  @ApiProperty({ description: '총 클릭수' })
  totalClicks: number;

  @ApiProperty({ description: '클릭률 (%)' })
  ctr: number;
}

// ========================================
// 수익 통계
// ========================================

export class EarningsStatDto {
  @ApiProperty({ description: '날짜/기간' })
  period: string;

  @ApiProperty({ description: '광고 수익 (원)' })
  adEarnings: number;

  @ApiProperty({ description: '파트너스 수익 (원)' })
  partnerEarnings: number;

  @ApiProperty({ description: '총 수익 (원)' })
  total: number;
}

export class EarningsRangeDto {
  @ApiProperty({ description: '기간별 수익', type: [EarningsStatDto] })
  data: EarningsStatDto[];

  @ApiProperty({ description: '총 수익 (원)' })
  totalEarnings: number;

  @ApiProperty({ description: '평균 일 수익 (원)' })
  avgDailyEarnings: number;
}

// ========================================
// 활동 로그
// ========================================

export class ActivityLogDto {
  @ApiProperty({ description: '활동 ID' })
  id: string;

  @ApiProperty({ description: '활동 유형', enum: ['deal_proposed', 'deal_accepted', 'deal_paid', 'deal_submitted', 'deal_settled', 'withdrawal', 'post_published'] })
  type: string;

  @ApiProperty({ description: '활동 설명' })
  description: string;

  @ApiPropertyOptional({ description: '관련 금액' })
  amount?: number;

  @ApiProperty({ description: '활동 시간' })
  createdAt: Date;
}

// ========================================
// 광고 성과
// ========================================

export class DealPerformanceDto {
  @ApiProperty({ description: '거래 ID' })
  dealId: string;

  @ApiProperty({ description: '광고 제목' })
  title: string;

  @ApiProperty({ description: '상대방 이름' })
  partnerName: string;

  @ApiProperty({ description: '금액' })
  amount: number;

  @ApiProperty({ description: '상태' })
  status: string;

  @ApiProperty({ description: '생성일' })
  createdAt: Date;

  @ApiPropertyOptional({ description: '완료일' })
  completedAt?: Date;
}
