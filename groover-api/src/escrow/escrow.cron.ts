// src/escrow/escrow.cron.ts

import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { EscrowService } from './escrow.service';

@Injectable()
export class EscrowCronService {
  private readonly logger = new Logger(EscrowCronService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly escrowService: EscrowService,
  ) {}

  // 매시간 실행
  @Cron(CronExpression.EVERY_HOUR)
  async handleEscrowDeadlines() {
    this.logger.log('에스크로 기한 체크 시작...');
    
    const now = new Date();

    try {
      await this.processAutoConfirm(now);
      await this.processAutoRefund(now);
      this.logger.log('에스크로 기한 체크 완료');
    } catch (error) {
      this.logger.error('에스크로 처리 중 오류:', error);
    }
  }

  // 72시간 경과 → 자동 승인
  private async processAutoConfirm(now: Date) {
    const expiredDeals = await this.prisma.adDeal.findMany({
      where: {
        status: 'SUBMITTED',
        confirmDeadline: { lt: now },
      },
    });

    this.logger.log(`자동 승인 대상: ${expiredDeals.length}건`);

    for (const deal of expiredDeals) {
      try {
        await this.escrowService.settlePayment(deal.id, 'SYSTEM_AUTO_CONFIRM');
        this.logger.log(`자동 승인 완료: dealId=${deal.id}`);
      } catch (error) {
        this.logger.error(`자동 승인 실패: dealId=${deal.id}`, error);
      }
    }
  }

  // 14일 경과 → 자동 환불
  private async processAutoRefund(now: Date) {
    const expiredDeals = await this.prisma.adDeal.findMany({
      where: {
        status: 'PAID',
        submitDeadline: { lt: now },
      },
    });

    this.logger.log(`자동 환불 대상: ${expiredDeals.length}건`);

    for (const deal of expiredDeals) {
      try {
        await this.escrowService.refundPayment(
          deal.id,
          '제출 기한 만료 (14일)',
          'SYSTEM_AUTO_REFUND',
        );
        
        await this.warnCreator(deal.creatorId);
        this.logger.log(`자동 환불 완료: dealId=${deal.id}`);
      } catch (error) {
        this.logger.error(`자동 환불 실패: dealId=${deal.id}`, error);
      }
    }
  }

  // 크리에이터 경고
  private async warnCreator(creatorId: string) {
    try {
      await this.prisma.user.update({
        where: { id: creatorId },
        data: { warningCount: { increment: 2 } },
      });

      await this.prisma.userWarning.create({
        data: {
          userId: creatorId,
          type: 'OTHER',
          reason: '광고 콘텐츠 미제출 (기한 만료)',
        },
      });

      const user = await this.prisma.user.findUnique({
        where: { id: creatorId },
        select: { warningCount: true },
      });

      if (user && user.warningCount >= 3) {
        const suspendedUntil = new Date();
        suspendedUntil.setDate(suspendedUntil.getDate() + 7);

        await this.prisma.user.update({
          where: { id: creatorId },
          data: {
            adMatchingSuspended: true,
            suspendedUntil,
          },
        });
      }
    } catch (error) {
      this.logger.error(`크리에이터 경고 실패: userId=${creatorId}`, error);
    }
  }

  // 매일 자정: 정지 해제
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleSuspensionLift() {
    const now = new Date();

    const usersToLift = await this.prisma.user.findMany({
      where: {
        adMatchingSuspended: true,
        suspendedUntil: { lt: now },
      },
    });

    for (const user of usersToLift) {
      try {
        await this.prisma.user.update({
          where: { id: user.id },
          data: {
            adMatchingSuspended: false,
            suspendedUntil: null,
          },
        });
        this.logger.log(`정지 해제: userId=${user.id}`);
      } catch (error) {
        this.logger.error(`정지 해제 실패: userId=${user.id}`, error);
      }
    }
  }
}
