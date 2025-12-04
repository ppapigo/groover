// src/ad/services/settlement.service.ts
import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { WalletService } from './wallet.service';

@Injectable()
export class SettlementService {
  private readonly logger = new Logger(SettlementService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly walletService: WalletService,
  ) {}

  /**
   * 작업 완료 후 정산 처리
   * - 광고주가 완료 확인하면 호출됨
   */
  async processSettlement(proposalId: string) {
    const proposal = await this.prisma.adProposal.findUnique({
      where: { id: proposalId },
      include: {
        payment: {
          include: { settlement: true },
        },
      },
    });

    if (!proposal) {
      throw new NotFoundException('광고 제안을 찾을 수 없습니다.');
    }

    if (proposal.status !== 'COMPLETED') {
      throw new BadRequestException('완료된 광고만 정산할 수 있습니다.');
    }

    if (!proposal.payment) {
      throw new BadRequestException('결제 정보가 없습니다.');
    }

    const settlement = proposal.payment.settlement;
    if (!settlement) {
      throw new BadRequestException('정산 정보가 없습니다.');
    }

    if (settlement.status === 'COMPLETED') {
      throw new BadRequestException('이미 정산이 완료되었습니다.');
    }

    // 지갑에 잔액 추가
    await this.walletService.addBalance(
      proposal.creatorId,
      settlement.amount,
      `광고비 정산: ${proposal.title}`,
      settlement.id,
      'SETTLEMENT',
    );

    // 정산 완료 처리
    await this.prisma.settlement.update({
      where: { id: settlement.id },
      data: {
        status: 'COMPLETED',
        settledAt: new Date(),
      },
    });

    this.logger.log(`Settlement completed: ${settlement.id} (${settlement.amount}원)`);

    return {
      success: true,
      settlementId: settlement.id,
      amount: settlement.amount,
      message: '정산이 완료되었습니다.',
    };
  }

  /**
   * 광고주가 작업 완료 확인
   */
  async confirmCompletion(advertiserId: string, proposalId: string) {
    const proposal = await this.prisma.adProposal.findUnique({
      where: { id: proposalId },
    });

    if (!proposal) {
      throw new NotFoundException('광고 제안을 찾을 수 없습니다.');
    }

    if (proposal.advertiserId !== advertiserId) {
      throw new BadRequestException('권한이 없습니다.');
    }

    if (proposal.status !== 'COMPLETED' && proposal.status !== 'PAID') {
      throw new BadRequestException('결제 완료 또는 완료 상태인 제안만 확인할 수 있습니다.');
    }

    // 제안 상태 업데이트
    await this.prisma.adProposal.update({
      where: { id: proposalId },
      data: { status: 'COMPLETED' },
    });

    // 정산 처리
    return this.processSettlement(proposalId);
  }

  /**
   * 내 정산 내역 조회
   */
  async getMySettlements(
    userId: string,
    status?: string,
    cursor?: string,
    limit: number = 20,
  ) {
    const settlements = await this.prisma.settlement.findMany({
      where: {
        recipientId: userId,
        ...(status && { status: status as any }),
      },
      include: {
        payment: {
          include: {
            proposal: {
              select: { id: true, title: true, advertiserId: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      ...(cursor && {
        cursor: { id: cursor },
        skip: 1,
      }),
    });

    const hasMore = settlements.length > limit;
    const items = hasMore ? settlements.slice(0, -1) : settlements;

    return {
      items,
      nextCursor: hasMore ? items[items.length - 1].id : null,
      hasMore,
    };
  }

  /**
   * 정산 통계
   */
  async getSettlementStats(userId: string) {
    const [total, pending, completed, totalAmount] = await Promise.all([
      this.prisma.settlement.count({ where: { recipientId: userId } }),
      this.prisma.settlement.count({
        where: { recipientId: userId, status: { in: ['PENDING', 'READY'] } },
      }),
      this.prisma.settlement.count({
        where: { recipientId: userId, status: 'COMPLETED' },
      }),
      this.prisma.settlement.aggregate({
        where: { recipientId: userId, status: 'COMPLETED' },
        _sum: { amount: true },
      }),
    ]);

    // 이번 달 정산
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const monthlySettlement = await this.prisma.settlement.aggregate({
      where: {
        recipientId: userId,
        status: 'COMPLETED',
        settledAt: { gte: startOfMonth },
      },
      _sum: { amount: true },
    });

    return {
      total,
      pending,
      completed,
      totalAmount: totalAmount._sum.amount || 0,
      monthlyAmount: monthlySettlement._sum.amount || 0,
    };
  }
}
