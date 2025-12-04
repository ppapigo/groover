// src/ad/services/ad-payment.service.ts
import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TossPaymentService } from './toss-payment.service';
import { WalletService } from './wallet.service';
import { InitiatePaymentDto, ConfirmPaymentDto } from '../dto';

@Injectable()
export class AdPaymentService {
  private readonly logger = new Logger(AdPaymentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tossPayment: TossPaymentService,
    private readonly walletService: WalletService,
  ) {}

  /**
   * 결제 시작 (광고주가 호출)
   */
  async initiatePayment(advertiserId: string, dto: InitiatePaymentDto) {
    const proposal = await this.prisma.adProposal.findUnique({
      where: { id: dto.proposalId },
      include: { payment: true },
    });

    if (!proposal) {
      throw new NotFoundException('광고 제안을 찾을 수 없습니다.');
    }

    if (proposal.advertiserId !== advertiserId) {
      throw new ForbiddenException('결제 권한이 없습니다.');
    }

    if (proposal.status !== 'ACCEPTED') {
      throw new BadRequestException('수락된 제안만 결제할 수 있습니다.');
    }

    if (proposal.payment) {
      throw new BadRequestException('이미 결제가 진행 중입니다.');
    }

    // 수수료 계산
    const fees = this.tossPayment.calculateFees(proposal.budget);
    const orderId = this.tossPayment.generateOrderId();

    // 결제 레코드 생성
    const payment = await this.prisma.adPayment.create({
      data: {
        proposalId: proposal.id,
        payerId: advertiserId,
        amount: fees.totalAmount,
        platformFee: fees.platformFee,
        creatorAmount: fees.creatorAmount,
        feeRate: fees.feeRate,
        tossOrderId: orderId,
      },
    });

    this.logger.log(`Payment initiated: ${payment.id} (Order: ${orderId})`);

    // 토스페이먼츠 결제창 URL 정보 반환
    return {
      paymentId: payment.id,
      orderId,
      amount: fees.totalAmount,
      orderName: `광고 제안: ${proposal.title}`,
      successUrl: dto.successUrl || `${process.env.FRONTEND_URL}/payment/success`,
      failUrl: dto.failUrl || `${process.env.FRONTEND_URL}/payment/fail`,
      // 토스페이먼츠 클라이언트 키
      clientKey: process.env.TOSS_CLIENT_KEY,
    };
  }

  /**
   * 결제 승인 (토스 콜백)
   */
  async confirmPayment(advertiserId: string, dto: ConfirmPaymentDto) {
    // 결제 레코드 조회
    const payment = await this.prisma.adPayment.findUnique({
      where: { tossOrderId: dto.orderId },
      include: { proposal: true },
    });

    if (!payment) {
      throw new NotFoundException('결제 정보를 찾을 수 없습니다.');
    }

    if (payment.payerId !== advertiserId) {
      throw new ForbiddenException('결제 권한이 없습니다.');
    }

    if (payment.status !== 'PENDING') {
      throw new BadRequestException('이미 처리된 결제입니다.');
    }

    // 금액 검증
    if (payment.amount !== dto.amount) {
      throw new BadRequestException('결제 금액이 일치하지 않습니다.');
    }

    // 토스페이먼츠 결제 승인
    const tossResult = await this.tossPayment.confirmPayment(
      dto.paymentKey,
      dto.orderId,
      dto.amount,
    );

    // 트랜잭션으로 업데이트
    await this.prisma.$transaction([
      // 결제 완료 처리
      this.prisma.adPayment.update({
        where: { id: payment.id },
        data: {
          status: 'COMPLETED',
          tossPaymentKey: dto.paymentKey,
          method: tossResult.method,
          paidAt: new Date(),
        },
      }),
      // 제안 상태 변경
      this.prisma.adProposal.update({
        where: { id: payment.proposalId },
        data: { status: 'PAID' },
      }),
      // 정산 레코드 생성 (대기 상태)
      this.prisma.settlement.create({
        data: {
          paymentId: payment.id,
          recipientId: payment.proposal.creatorId,
          amount: payment.creatorAmount,
          status: 'PENDING',
        },
      }),
    ]);

    this.logger.log(`Payment confirmed: ${payment.id}`);

    return {
      success: true,
      paymentId: payment.id,
      message: '결제가 완료되었습니다.',
    };
  }

  /**
   * 결제 취소/환불
   */
  async cancelPayment(
    userId: string,
    paymentId: string,
    reason: string,
  ) {
    const payment = await this.prisma.adPayment.findUnique({
      where: { id: paymentId },
      include: { proposal: true },
    });

    if (!payment) {
      throw new NotFoundException('결제 정보를 찾을 수 없습니다.');
    }

    // 광고주 또는 관리자만 취소 가능
    if (payment.payerId !== userId) {
      throw new ForbiddenException('취소 권한이 없습니다.');
    }

    if (payment.status !== 'COMPLETED') {
      throw new BadRequestException('완료된 결제만 취소할 수 있습니다.');
    }

    // 진행 중인 작업이 있으면 취소 불가
    if (payment.proposal.status === 'IN_PROGRESS') {
      throw new BadRequestException('진행 중인 광고는 취소할 수 없습니다.');
    }

    // 토스페이먼츠 환불
    if (payment.tossPaymentKey) {
      await this.tossPayment.cancelPayment(payment.tossPaymentKey, reason);
    }

    // 상태 업데이트
    await this.prisma.$transaction([
      this.prisma.adPayment.update({
        where: { id: paymentId },
        data: {
          status: 'REFUNDED',
          cancelledAt: new Date(),
        },
      }),
      this.prisma.adProposal.update({
        where: { id: payment.proposalId },
        data: { status: 'CANCELLED' },
      }),
      // 정산 취소
      this.prisma.settlement.updateMany({
        where: { paymentId },
        data: { status: 'FAILED' },
      }),
    ]);

    this.logger.log(`Payment cancelled: ${paymentId}`);

    return {
      success: true,
      message: '결제가 취소되었습니다.',
    };
  }

  /**
   * 결제 내역 조회
   */
  async getPayments(
    userId: string,
    cursor?: string,
    limit: number = 20,
  ) {
    const payments = await this.prisma.adPayment.findMany({
      where: { payerId: userId },
      include: {
        proposal: {
          select: { id: true, title: true, creatorId: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      ...(cursor && {
        cursor: { id: cursor },
        skip: 1,
      }),
    });

    const hasMore = payments.length > limit;
    const items = hasMore ? payments.slice(0, -1) : payments;

    return {
      items,
      nextCursor: hasMore ? items[items.length - 1].id : null,
      hasMore,
    };
  }
}
