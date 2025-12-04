// src/ad/dto/index.ts
import {
  IsString,
  IsOptional,
  IsInt,
  IsEnum,
  IsDateString,
  MaxLength,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

// ============================================
// 광고 제안
// ============================================

export class CreateAdProposalDto {
  @IsString()
  creatorId: string;  // 제안 받을 유저

  @IsString()
  @MaxLength(100)
  title: string;

  @IsString()
  @MaxLength(2000)
  description: string;

  @IsInt()
  @Min(10000)  // 최소 1만원
  @Max(100000000)  // 최대 1억
  budget: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  requirements?: string;

  @IsOptional()
  @IsDateString()
  deadline?: string;
}

export class RespondProposalDto {
  @IsEnum(['ACCEPTED', 'REJECTED'])
  response: 'ACCEPTED' | 'REJECTED';

  @IsOptional()
  @IsString()
  @MaxLength(500)
  message?: string;
}

export class ProposalQueryDto {
  @IsOptional()
  @IsEnum(['sent', 'received'])
  type?: 'sent' | 'received';

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 20;
}

// ============================================
// 결제
// ============================================

export class InitiatePaymentDto {
  @IsString()
  proposalId: string;

  @IsOptional()
  @IsString()
  successUrl?: string;

  @IsOptional()
  @IsString()
  failUrl?: string;
}

export class ConfirmPaymentDto {
  @IsString()
  paymentKey: string;

  @IsString()
  orderId: string;

  @IsInt()
  amount: number;
}

// ============================================
// 지갑
// ============================================

export class VerifyAccountDto {
  @IsString()
  bankCode: string;  // 은행 코드

  @IsString()
  bankName: string;

  @IsString()
  accountNumber: string;

  @IsString()
  accountHolder: string;
}

export class WithdrawDto {
  @IsInt()
  @Min(50000)  // 최소 5만원
  amount: number;
}

export class TransactionQueryDto {
  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
