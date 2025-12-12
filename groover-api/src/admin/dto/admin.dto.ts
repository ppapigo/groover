// src/admin/dto/admin.dto.ts

import { IsString, IsOptional, IsEnum, IsNumber, Min, Max } from 'class-validator';

// ========================================
// 유저 관리
// ========================================

export class SuspendUserDto {
  @IsNumber()
  @Min(1)
  @Max(365)
  days: number;

  @IsString()
  reason: string;
}

export class WarnUserDto {
  @IsEnum(['SPAM', 'ABUSE', 'SCAM', 'OTHER'])
  type: string;

  @IsString()
  reason: string;
}

// ========================================
// 신고 관리
// ========================================

export class ProcessReportDto {
  @IsEnum(['RESOLVED', 'DISMISSED'])
  status: string;

  @IsString()
  @IsOptional()
  note?: string;

  @IsOptional()
  punishUser?: boolean;

  @IsNumber()
  @IsOptional()
  suspendDays?: number;
}