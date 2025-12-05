// src/escrow/dto/escrow.dto.ts

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsUrl, Min, MaxLength } from 'class-validator';

// ========================================
// 요청 DTO
// ========================================

export class CreateProposalDto {
  @ApiProperty({ description: '크리에이터 ID', example: 'user-uuid-1234' })
  @IsString()
  creatorId: string;

  @ApiPropertyOptional({ description: '대화방 ID (DM 연결용)' })
  @IsString()
  @IsOptional()
  conversationId?: string;

  @ApiProperty({ description: '광고 제목', example: '인스타그램 제품 리뷰' })
  @IsString()
  @MaxLength(100)
  title: string;

  @ApiPropertyOptional({ description: '광고 상세 설명' })
  @IsString()
  @IsOptional()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({ description: '광고 요구사항' })
  @IsString()
  @IsOptional()
  @MaxLength(2000)
  requirements?: string;

  @ApiProperty({ description: '광고비 (원)', example: 100000, minimum: 10000 })
  @IsNumber()
  @Min(10000, { message: '최소 광고비는 10,000원입니다.' })
  totalAmount: number;
}

export class SubmitContentDto {
  @ApiProperty({ description: '거래 ID' })
  @IsString()
  dealId: string;

  @ApiProperty({ description: '제출 콘텐츠 URL', example: 'https://instagram.com/p/xxx' })
  @IsUrl()
  submissionUrl: string;

  @ApiPropertyOptional({ description: '제출 메모' })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  submissionNote?: string;
}

export class PaymentDto {
  @ApiProperty({ description: '토스페이먼츠 결제키' })
  @IsString()
  paymentId: string;

  @ApiProperty({ description: '결제 금액', example: 100000 })
  @IsNumber()
  amount: number;
}

export class RejectContentDto {
  @ApiProperty({ description: '거절 사유' })
  @IsString()
  @MaxLength(500)
  reason: string;
}

export class CancelDealDto {
  @ApiProperty({ description: '취소 사유' })
  @IsString()
  @MaxLength(500)
  reason: string;
}

// ========================================
// 응답 DTO
// ========================================

export class UserSummaryDto {
  @ApiProperty({ description: '유저 ID' })
  id: string;

  @ApiProperty({ description: '이름', nullable: true })
  name: string | null;

  @ApiProperty({ description: '프로필 이미지', nullable: true })
  profileImageUrl: string | null;
}

export class AdDealResponseDto {
  @ApiProperty({ description: '거래 ID' })
  id: string;

  @ApiProperty({ description: '광고주 ID' })
  advertiserId: string;

  @ApiProperty({ description: '크리에이터 ID' })
  creatorId: string;

  @ApiProperty({ description: '광고 제목' })
  title: string;

  @ApiPropertyOptional({ description: '광고 설명' })
  description?: string;

  @ApiPropertyOptional({ description: '요구사항' })
  requirements?: string;

  @ApiProperty({ description: '총 광고비' })
  totalAmount: number;

  @ApiProperty({ description: '플랫폼 수수료 (15%)' })
  platformFee: number;

  @ApiProperty({ description: '크리에이터 수령액 (85%)' })
  creatorAmount: number;

  @ApiProperty({ 
    description: '거래 상태',
    enum: ['PROPOSED', 'ACCEPTED', 'PAID', 'SUBMITTED', 'CONFIRMED', 'SETTLED', 'REJECTED', 'CANCELLED', 'REFUNDED', 'EXPIRED']
  })
  status: string;

  @ApiPropertyOptional({ description: '에스크로 보관 금액' })
  escrowAmount?: number;

  @ApiPropertyOptional({ description: '결제 완료 시간' })
  paidAt?: Date;

  @ApiPropertyOptional({ description: '콘텐츠 제출 시간' })
  submittedAt?: Date;

  @ApiPropertyOptional({ description: '제출된 콘텐츠 URL' })
  submissionUrl?: string;

  @ApiPropertyOptional({ description: '제출 기한' })
  submitDeadline?: Date;

  @ApiPropertyOptional({ description: '확인 기한 (72시간)' })
  confirmDeadline?: Date;

  @ApiPropertyOptional({ description: '정산 완료 시간' })
  settledAt?: Date;

  @ApiProperty({ description: '생성 시간' })
  createdAt: Date;

  @ApiProperty({ description: '수정 시간' })
  updatedAt: Date;

  @ApiPropertyOptional({ description: '광고주 정보', type: UserSummaryDto })
  advertiser?: UserSummaryDto;

  @ApiPropertyOptional({ description: '크리에이터 정보', type: UserSummaryDto })
  creator?: UserSummaryDto;
}

export class AdDealListResponseDto {
  @ApiProperty({ description: '거래 목록', type: [AdDealResponseDto] })
  items: AdDealResponseDto[];

  @ApiProperty({ description: '전체 개수' })
  total: number;
}
