// src/dm/services/direct-trade-guard.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { filterContent, getBlockedMessage, FilterResult } from '../../common/filters/content-filter.util';

export interface DirectTradeCheckResult {
  allowed: boolean;
  filteredContent: string;
  message?: string;
  detectedTypes?: string[];
  warningCount?: number;
}

@Injectable()
export class DirectTradeGuardService {
  private readonly logger = new Logger(DirectTradeGuardService.name);

  private readonly SUSPENSION_THRESHOLDS = {
    WARNING_LIMIT: 3,
    TEMP_BAN_LIMIT: 5,
    PERM_BAN_LIMIT: 10,
  };

  constructor(private readonly prisma: PrismaService) {}

  async checkMessage(
    userId: string,
    threadId: string,
    content: string,
  ): Promise<DirectTradeCheckResult> {
    const filterResult = filterContent(content);

    if (!filterResult.isBlocked) {
      return {
        allowed: true,
        filteredContent: content,
      };
    }

    this.logger.warn(`직거래 시도 감지: userId=${userId}`);

    await this.logDirectTradeAttempt(userId, threadId, content, filterResult);
    const warningCount = await this.incrementWarning(userId, filterResult.detectedTypes);

    return {
      allowed: false,
      filteredContent: filterResult.filteredContent,
      message: getBlockedMessage(),
      detectedTypes: filterResult.detectedTypes,
      warningCount,
    };
  }

  private async logDirectTradeAttempt(
    userId: string,
    threadId: string,
    originalContent: string,
    filterResult: FilterResult,
  ): Promise<void> {
    try {
      await this.prisma.directTradeAttempt.create({
        data: {
          userId,
          threadId,
          originalContent,
          detectedPatterns: filterResult.detectedPatterns,
          detectedTypes: filterResult.detectedTypes,
        },
      });
    } catch (error) {
      this.logger.error('직거래 시도 로그 저장 실패:', error);
    }
  }

  private async incrementWarning(
    userId: string,
    detectedTypes: string[],
  ): Promise<number> {
    try {
      await this.prisma.userWarning.create({
        data: {
          userId,
          type: 'DIRECT_TRADE_ATTEMPT',
          reason: `직거래 시도: ${detectedTypes.join(', ')}`,
        },
      });

      const user = await this.prisma.user.update({
        where: { id: userId },
        data: {
          warningCount: { increment: 1 },
        },
        select: { warningCount: true },
      });

      await this.applySanction(userId, user.warningCount);

      return user.warningCount;
    } catch (error) {
      this.logger.error('경고 처리 실패:', error);
      return 0;
    }
  }

  private async applySanction(userId: string, warningCount: number): Promise<void> {
    const { WARNING_LIMIT, TEMP_BAN_LIMIT, PERM_BAN_LIMIT } = this.SUSPENSION_THRESHOLDS;

    if (warningCount >= PERM_BAN_LIMIT) {
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          adMatchingSuspended: true,
          suspendedUntil: null,
        },
      });
      this.logger.warn(`유저 영구 정지: userId=${userId}`);
    } else if (warningCount >= TEMP_BAN_LIMIT) {
      const suspendedUntil = new Date();
      suspendedUntil.setDate(suspendedUntil.getDate() + 7);
      
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          adMatchingSuspended: true,
          suspendedUntil,
        },
      });
      this.logger.warn(`유저 7일 정지: userId=${userId}`);
    } else if (warningCount >= WARNING_LIMIT) {
      const suspendedUntil = new Date();
      suspendedUntil.setDate(suspendedUntil.getDate() + 1);

      await this.prisma.user.update({
        where: { id: userId },
        data: {
          adMatchingSuspended: true,
          suspendedUntil,
        },
      });
      this.logger.warn(`유저 24시간 정지: userId=${userId}`);
    }
  }

  async liftSuspension(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        adMatchingSuspended: false,
        suspendedUntil: null,
      },
    });
  }
}
