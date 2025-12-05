// src/escrow/escrow.service.ts

import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProposalDto, SubmitContentDto } from './dto/escrow.dto';

@Injectable()
export class EscrowService {
  private readonly logger = new Logger(EscrowService.name);
  
  private readonly PLATFORM_FEE_RATE = 0.15;
  private readonly SUBMIT_DEADLINE_DAYS = 14;
  private readonly CONFIRM_DEADLINE_HOURS = 72;

  constructor(private readonly prisma: PrismaService) {}

  private calculateFees(totalAmount: number) {
    const platformFee = Math.floor(totalAmount * this.PLATFORM_FEE_RATE);
    const creatorAmount = totalAmount - platformFee;
    return { platformFee, creatorAmount };
  }

  // 1. 광고 제안 생성
  async createProposal(advertiserId: string, dto: CreateProposalDto) {
    const { platformFee, creatorAmount } = this.calculateFees(dto.totalAmount);

    const deal = await this.prisma.adDeal.create({
      data: {
        advertiserId,
        creatorId: dto.creatorId,
        conversationId: dto.conversationId,
        title: dto.title,
        description: dto.description,
        requirements: dto.requirements,
        totalAmount: dto.totalAmount,
        platformFee,
        creatorAmount,
        status: 'PROPOSED',
      },
    });

    await this.createLog(deal.id, 'PROPOSED', null, 'PROPOSED', null, advertiserId);
    return deal;
  }

  // 2. 제안 수락
  async acceptProposal(creatorId: string, dealId: string) {
    const deal = await this.getDeal(dealId);

    if (deal.creatorId !== creatorId) {
      throw new ForbiddenException('권한이 없습니다.');
    }

    if (deal.status !== 'PROPOSED') {
      throw new BadRequestException('수락할 수 없는 상태입니다.');
    }

    const updated = await this.prisma.adDeal.update({
      where: { id: dealId },
      data: { status: 'ACCEPTED' },
    });

    await this.createLog(dealId, 'ACCEPTED', 'PROPOSED', 'ACCEPTED', null, creatorId);
    return updated;
  }

  // 3. 제안 거절
  async rejectProposal(creatorId: string, dealId: string) {
    const deal = await this.getDeal(dealId);

    if (deal.creatorId !== creatorId) {
      throw new ForbiddenException('권한이 없습니다.');
    }

    if (deal.status !== 'PROPOSED') {
      throw new BadRequestException('거절할 수 없는 상태입니다.');
    }

    const updated = await this.prisma.adDeal.update({
      where: { id: dealId },
      data: { status: 'CANCELLED', cancelReason: '크리에이터 거절' },
    });

    await this.createLog(dealId, 'REJECTED_BY_CREATOR', 'PROPOSED', 'CANCELLED', null, creatorId);
    return updated;
  }

  // 4. 결제 완료 처리
  async processPayment(
    advertiserId: string,
    dealId: string,
    paymentId: string,
    amount: number,
  ) {
    const deal = await this.getDeal(dealId);

    if (deal.advertiserId !== advertiserId) {
      throw new ForbiddenException('권한이 없습니다.');
    }

    if (deal.status !== 'ACCEPTED') {
      throw new BadRequestException('결제할 수 없는 상태입니다.');
    }

    if (deal.totalAmount !== amount) {
      throw new BadRequestException('결제 금액이 일치하지 않습니다.');
    }

    const submitDeadline = new Date();
    submitDeadline.setDate(submitDeadline.getDate() + this.SUBMIT_DEADLINE_DAYS);

    const updated = await this.prisma.adDeal.update({
      where: { id: dealId },
      data: {
        status: 'PAID',
        paymentId,
        paidAt: new Date(),
        escrowAmount: amount,
        submitDeadline,
      },
    });

    // 크리에이터 pendingBalance 업데이트
    await this.prisma.wallet.update({
      where: { userId: deal.creatorId },
      data: {
        pendingBalance: { increment: deal.creatorAmount },
      },
    });

    await this.createLog(dealId, 'PAID', 'ACCEPTED', 'PAID', amount, advertiserId);
    return updated;
  }

  // 5. 콘텐츠 제출
  async submitContent(creatorId: string, dto: SubmitContentDto) {
    const deal = await this.getDeal(dto.dealId);

    if (deal.creatorId !== creatorId) {
      throw new ForbiddenException('권한이 없습니다.');
    }

    if (deal.status !== 'PAID') {
      throw new BadRequestException('제출할 수 없는 상태입니다.');
    }

    if (deal.submitDeadline && new Date() > deal.submitDeadline) {
      throw new BadRequestException('제출 기한이 지났습니다.');
    }

    const confirmDeadline = new Date();
    confirmDeadline.setHours(confirmDeadline.getHours() + this.CONFIRM_DEADLINE_HOURS);

    const updated = await this.prisma.adDeal.update({
      where: { id: dto.dealId },
      data: {
        status: 'SUBMITTED',
        submittedAt: new Date(),
        submissionUrl: dto.submissionUrl,
        submissionNote: dto.submissionNote,
        confirmDeadline,
      },
    });

    await this.createLog(dto.dealId, 'SUBMITTED', 'PAID', 'SUBMITTED', null, creatorId);
    return updated;
  }

  // 6. 광고주 확인 승인
  async confirmContent(advertiserId: string, dealId: string) {
    const deal = await this.getDeal(dealId);

    if (deal.advertiserId !== advertiserId) {
      throw new ForbiddenException('권한이 없습니다.');
    }

    if (deal.status !== 'SUBMITTED') {
      throw new BadRequestException('확인할 수 없는 상태입니다.');
    }

    await this.settlePayment(dealId, advertiserId);
    return this.getDeal(dealId);
  }

  // 7. 광고주 거절
  async rejectContent(advertiserId: string, dealId: string, reason: string) {
    const deal = await this.getDeal(dealId);

    if (deal.advertiserId !== advertiserId) {
      throw new ForbiddenException('권한이 없습니다.');
    }

    if (deal.status !== 'SUBMITTED') {
      throw new BadRequestException('거절할 수 없는 상태입니다.');
    }

    const updated = await this.prisma.adDeal.update({
      where: { id: dealId },
      data: {
        status: 'PAID',
        rejectedAt: new Date(),
        rejectReason: reason,
        submittedAt: null,
        submissionUrl: null,
        confirmDeadline: null,
      },
    });

    await this.createLog(dealId, 'REJECTED', 'SUBMITTED', 'PAID', null, advertiserId, reason);
    return updated;
  }

  // 8. 정산 처리
  async settlePayment(dealId: string, performedBy: string = 'SYSTEM') {
    const deal = await this.getDeal(dealId);

    await this.prisma.$transaction(async (tx) => {
      await tx.adDeal.update({
        where: { id: dealId },
        data: {
          status: 'SETTLED',
          confirmedAt: new Date(),
          settledAt: new Date(),
        },
      });

      const wallet = await tx.wallet.findUnique({
        where: { userId: deal.creatorId },
      });

      if (wallet) {
        await tx.wallet.update({
          where: { userId: deal.creatorId },
          data: {
            pendingBalance: { decrement: deal.creatorAmount },
            balance: { increment: deal.creatorAmount },
            totalEarned: { increment: deal.creatorAmount },
          },
        });

        await tx.walletTransaction.create({
          data: {
            walletId: wallet.id,
            type: 'AD_REWARD',
            amount: deal.creatorAmount,
            balance: wallet.balance + deal.creatorAmount,
            description: `광고비 정산: ${deal.title}`,
            referenceId: dealId,
            referenceType: 'AD_DEAL',
          },
        });
      }
    });

    await this.createLog(dealId, 'SETTLED', 'SUBMITTED', 'SETTLED', deal.creatorAmount, performedBy);
  }

  // 9. 환불 처리
  async refundPayment(dealId: string, reason: string, performedBy: string = 'SYSTEM') {
    const deal = await this.getDeal(dealId);

    if (!['PAID', 'SUBMITTED'].includes(deal.status)) {
      throw new BadRequestException('환불할 수 없는 상태입니다.');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.adDeal.update({
        where: { id: dealId },
        data: {
          status: 'REFUNDED',
          refundedAt: new Date(),
          refundReason: reason,
        },
      });

      await tx.wallet.update({
        where: { userId: deal.creatorId },
        data: {
          pendingBalance: { decrement: deal.creatorAmount },
        },
      });
    });

    await this.createLog(dealId, 'REFUNDED', deal.status, 'REFUNDED', deal.totalAmount, performedBy, reason);
  }

  // 10. 취소 요청
  async cancelDeal(userId: string, dealId: string, reason: string) {
    const deal = await this.getDeal(dealId);

    if (deal.advertiserId !== userId && deal.creatorId !== userId) {
      throw new ForbiddenException('권한이 없습니다.');
    }

    if (!['PROPOSED', 'ACCEPTED'].includes(deal.status)) {
      throw new BadRequestException('취소할 수 없는 상태입니다.');
    }

    const updated = await this.prisma.adDeal.update({
      where: { id: dealId },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
        cancelReason: reason,
      },
    });

    await this.createLog(dealId, 'CANCELLED', deal.status, 'CANCELLED', null, userId, reason);
    return updated;
  }

  async getDeal(dealId: string) {
    const deal = await this.prisma.adDeal.findUnique({
      where: { id: dealId },
      include: {
        advertiser: { select: { id: true, name: true, profileImageUrl: true } },
        creator: { select: { id: true, name: true, profileImageUrl: true } },
      },
    });

    if (!deal) {
      throw new NotFoundException('거래를 찾을 수 없습니다.');
    }

    return deal;
  }

  async getMyDeals(userId: string, role: 'advertiser' | 'creator', status?: string) {
    const where: any = {};

    if (role === 'advertiser') {
      where.advertiserId = userId;
    } else {
      where.creatorId = userId;
    }

    if (status) {
      where.status = status;
    }

    return this.prisma.adDeal.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        advertiser: { select: { id: true, name: true, profileImageUrl: true } },
        creator: { select: { id: true, name: true, profileImageUrl: true } },
      },
    });
  }

  private async createLog(
    dealId: string,
    action: string,
    fromStatus: string | null,
    toStatus: string,
    amount: number | null,
    performedBy: string,
    note?: string,
  ) {
    await this.prisma.escrowLog.create({
      data: {
        dealId,
        action,
        fromStatus,
        toStatus,
        amount,
        performedBy,
        note,
      },
    });
  }
}
