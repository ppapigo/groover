// src/ad/services/wallet.service.ts
import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { VerifyAccountDto, WithdrawDto } from '../dto';
import * as crypto from 'crypto';

@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);
  private readonly MIN_WITHDRAWAL = 50000; // 최소 출금 5만원

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 지갑 조회/생성
   */
  async getOrCreateWallet(userId: string) {
    let wallet = await this.prisma.wallet.findUnique({
      where: { userId },
    });

    if (!wallet) {
      wallet = await this.prisma.wallet.create({
        data: { userId },
      });
    }

    return this.formatWallet(wallet);
  }

  /**
   * 지갑 상세 (잔액, 통계)
   */
  async getWalletDetails(userId: string) {
    const wallet = await this.getOrCreateWallet(userId);

    // 이번 달 수익
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const monthlyEarnings = await this.prisma.walletTransaction.aggregate({
      where: {
        wallet: { userId },
        type: 'EARNING',
        createdAt: { gte: startOfMonth },
      },
      _sum: { amount: true },
    });

    // 대기 중인 정산
    const pendingSettlements = await this.prisma.settlement.count({
      where: {
        recipientId: userId,
        status: { in: ['PENDING', 'READY'] },
      },
    });

    return {
      ...wallet,
      monthlyEarnings: monthlyEarnings._sum.amount || 0,
      pendingSettlements,
    };
  }

  /**
   * 계좌 인증 (KYC)
   */
  async verifyAccount(userId: string, dto: VerifyAccountDto) {
    const wallet = await this.prisma.wallet.findUnique({
      where: { userId },
    });

    if (!wallet) {
      throw new NotFoundException('지갑을 찾을 수 없습니다.');
    }

    // TODO: 실제 계좌 인증 API 연동 (예: 토스, 쿠콘 등)
    // 여기서는 간단히 저장만 함

    // 계좌번호 암호화 저장
    const encryptedAccount = this.encryptAccountNumber(dto.accountNumber);

    await this.prisma.wallet.update({
      where: { userId },
      data: {
        isVerified: true,
        bankName: dto.bankName,
        bankAccount: encryptedAccount,
        accountHolder: dto.accountHolder,
        verifiedAt: new Date(),
      },
    });

    this.logger.log(`Account verified for user ${userId}`);
    
    return {
      success: true,
      message: '계좌 인증이 완료되었습니다.',
    };
  }

  /**
   * 잔액 추가 (정산 입금)
   */
  async addBalance(
    userId: string,
    amount: number,
    description: string,
    referenceId?: string,
    referenceType?: string,
  ) {
    const wallet = await this.prisma.wallet.findUnique({
      where: { userId },
    });

    if (!wallet) {
      throw new NotFoundException('지갑을 찾을 수 없습니다.');
    }

    const newBalance = wallet.balance + amount;

    await this.prisma.$transaction([
      // 잔액 업데이트
      this.prisma.wallet.update({
        where: { userId },
        data: {
          balance: newBalance,
          totalEarned: { increment: amount },
        },
      }),
      // 거래 내역 추가
      this.prisma.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: 'EARNING',
          amount,
          balance: newBalance,
          description,
          referenceId,
          referenceType,
        },
      }),
    ]);

    this.logger.log(`Balance added: ${amount} for user ${userId}`);
  }

  /**
   * 출금 요청
   */
  async requestWithdrawal(userId: string, dto: WithdrawDto) {
    const wallet = await this.prisma.wallet.findUnique({
      where: { userId },
    });

    if (!wallet) {
      throw new NotFoundException('지갑을 찾을 수 없습니다.');
    }

    // 인증 확인
    if (!wallet.isVerified) {
      throw new BadRequestException('먼저 계좌 인증을 완료해주세요.');
    }

    // 최소 금액 확인
    if (dto.amount < this.MIN_WITHDRAWAL) {
      throw new BadRequestException(`최소 출금 금액은 ${this.MIN_WITHDRAWAL.toLocaleString()}원입니다.`);
    }

    // 잔액 확인
    if (wallet.balance < dto.amount) {
      throw new BadRequestException('잔액이 부족합니다.');
    }

    // 출금 수수료 (없음)
    const fee = 0;
    const netAmount = dto.amount - fee;
    const newBalance = wallet.balance - dto.amount;

    // 트랜잭션으로 처리
    const [withdrawal] = await this.prisma.$transaction([
      // 출금 요청 생성
      this.prisma.withdrawal.create({
        data: {
          walletId: wallet.id,
          userId,
          amount: dto.amount,
          fee,
          netAmount,
          bankName: wallet.bankName!,
          bankAccount: wallet.bankAccount!,
          accountHolder: wallet.accountHolder!,
        },
      }),
      // 잔액 차감
      this.prisma.wallet.update({
        where: { userId },
        data: { balance: newBalance },
      }),
      // 거래 내역
      this.prisma.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: 'WITHDRAWAL',
          amount: -dto.amount,
          balance: newBalance,
          description: `출금 요청 (${wallet.bankName} ${this.maskAccountNumber(wallet.bankAccount!)})`,
        },
      }),
    ]);

    this.logger.log(`Withdrawal requested: ${dto.amount} for user ${userId}`);
    
    return {
      id: withdrawal.id,
      amount: dto.amount,
      fee,
      netAmount,
      status: 'PENDING',
      message: '출금 요청이 접수되었습니다. 1-3 영업일 내 처리됩니다.',
    };
  }

  /**
   * 거래 내역 조회
   */
  async getTransactions(
    userId: string,
    type?: string,
    cursor?: string,
    limit: number = 20,
  ) {
    const wallet = await this.prisma.wallet.findUnique({
      where: { userId },
    });

    if (!wallet) {
      return { items: [], nextCursor: null, hasMore: false };
    }

    const transactions = await this.prisma.walletTransaction.findMany({
      where: {
        walletId: wallet.id,
        ...(type && { type: type as any }),
      },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      ...(cursor && {
        cursor: { id: cursor },
        skip: 1,
      }),
    });

    const hasMore = transactions.length > limit;
    const items = hasMore ? transactions.slice(0, -1) : transactions;

    return {
      items,
      nextCursor: hasMore ? items[items.length - 1].id : null,
      hasMore,
    };
  }

  /**
   * 출금 내역 조회
   */
  async getWithdrawals(userId: string, cursor?: string, limit: number = 20) {
    const withdrawals = await this.prisma.withdrawal.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      ...(cursor && {
        cursor: { id: cursor },
        skip: 1,
      }),
    });

    const hasMore = withdrawals.length > limit;
    const items = hasMore ? withdrawals.slice(0, -1) : withdrawals;

    return {
      items: items.map(w => ({
        ...w,
        bankAccount: this.maskAccountNumber(w.bankAccount),
      })),
      nextCursor: hasMore ? items[items.length - 1].id : null,
      hasMore,
    };
  }

  // ========================================
  // 헬퍼 메서드
  // ========================================

  private formatWallet(wallet: any) {
    return {
      id: wallet.id,
      balance: wallet.balance,
      pendingBalance: wallet.pendingBalance,
      totalEarned: wallet.totalEarned,
      totalWithdrawn: wallet.totalWithdrawn,
      isVerified: wallet.isVerified,
      bankName: wallet.bankName,
      bankAccount: wallet.bankAccount ? this.maskAccountNumber(wallet.bankAccount) : null,
      accountHolder: wallet.accountHolder,
    };
  }

  private encryptAccountNumber(accountNumber: string): string {
    // 실제로는 더 안전한 암호화 사용
    const cipher = crypto.createCipheriv(
      'aes-256-cbc',
      Buffer.from(process.env.ENCRYPTION_KEY || 'default-key-32-characters-long!'),
      Buffer.from(process.env.ENCRYPTION_IV || '16-characters-iv'),
    );
    let encrypted = cipher.update(accountNumber, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
  }

  private maskAccountNumber(accountNumber: string): string {
    // 암호화된 계좌번호면 마스킹 처리
    if (accountNumber.length > 20) {
      // 복호화 후 마스킹 (여기서는 간단히 처리)
      return '****-****-****';
    }
    // 일반 계좌번호면 앞 4자리만 보여주기
    return accountNumber.slice(0, 4) + '****';
  }
}
