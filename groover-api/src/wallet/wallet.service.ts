import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TransactionType } from '@prisma/client';

@Injectable()
export class WalletService {
  constructor(private prisma: PrismaService) {}

  // 지갑 조회 (없으면 생성)
  async getOrCreateWallet(userId: string) {
    let wallet = await this.prisma.wallet.findUnique({
      where: { userId },
    });

    if (!wallet) {
      wallet = await this.prisma.wallet.create({
        data: { userId },
      });
    }

    return wallet;
  }

  // 지갑 상세 조회
  async getWalletDetail(userId: string) {
    const wallet = await this.getOrCreateWallet(userId);
    
    const recentTransactions = await this.prisma.walletTransaction.findMany({
      where: { walletId: wallet.id },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    return {
      ...wallet,
      recentTransactions,
    };
  }

  // 거래 내역 조회
  async getTransactions(userId: string, page: number = 1, limit: number = 20) {
    const wallet = await this.getOrCreateWallet(userId);

    const [transactions, total] = await Promise.all([
      this.prisma.walletTransaction.findMany({
        where: { walletId: wallet.id },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.walletTransaction.count({
        where: { walletId: wallet.id },
      }),
    ]);

    return {
      transactions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // 수익 추가 (광고 완료 시)
  async addEarning(userId: string, amount: number, description: string, referenceId?: string) {
    const wallet = await this.getOrCreateWallet(userId);

    const [updatedWallet, transaction] = await this.prisma.$transaction([
      this.prisma.wallet.update({
        where: { id: wallet.id },
        data: {
          balance: { increment: amount },
          totalEarned: { increment: amount },
        },
      }),
      this.prisma.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: TransactionType.EARNING,
          amount: amount,
          balance: wallet.balance + amount,
          description,
          referenceId,
          referenceType: 'AD_DEAL',
        },
      }),
    ]);

    return { wallet: updatedWallet, transaction };
  }

  // 계좌 등록/수정
  async updateBankAccount(
    userId: string,
    bankName: string,
    bankAccount: string,
    accountHolder: string,
  ) {
    const wallet = await this.getOrCreateWallet(userId);

    return this.prisma.wallet.update({
      where: { id: wallet.id },
      data: {
        bankName,
        bankAccount,
        accountHolder,
        isVerified: false,
        verifiedAt: null,
      },
    });
  }

  // 출금 요청
  async requestWithdrawal(userId: string, amount: number) {
    const wallet = await this.getOrCreateWallet(userId);

    if (!wallet.isVerified) {
      throw new BadRequestException('계좌 인증이 필요합니다.');
    }

    if (!wallet.bankName || !wallet.bankAccount) {
      throw new BadRequestException('출금 계좌를 등록해주세요.');
    }

    if (amount < 10000) {
      throw new BadRequestException('최소 출금 금액은 10,000원입니다.');
    }

    if (wallet.balance < amount) {
      throw new BadRequestException('잔액이 부족합니다.');
    }

    const fee = 0;
    const netAmount = amount - fee;

    const [updatedWallet, transaction, withdrawal] = await this.prisma.$transaction([
      this.prisma.wallet.update({
        where: { id: wallet.id },
        data: {
          balance: { decrement: amount },
          totalWithdrawn: { increment: amount },
        },
      }),
      this.prisma.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: TransactionType.WITHDRAWAL,
          amount: -amount,
          balance: wallet.balance - amount,
          description: `출금 요청: ${amount.toLocaleString()}원`,
          referenceType: 'WITHDRAWAL',
        },
      }),
      this.prisma.withdrawal.create({
        data: {
          walletId: wallet.id,
          userId,
          amount,
          fee,
          netAmount,
          bankName: wallet.bankName!,
          bankAccount: wallet.bankAccount!,
          accountHolder: wallet.accountHolder!,
          status: 'PENDING',
        },
      }),
    ]);

    await this.prisma.walletTransaction.update({
      where: { id: transaction.id },
      data: { referenceId: withdrawal.id },
    });

    return { wallet: updatedWallet, withdrawal };
  }

  // 출금 내역 조회
  async getWithdrawals(userId: string, page: number = 1, limit: number = 20) {
    const [withdrawals, total] = await Promise.all([
      this.prisma.withdrawal.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.withdrawal.count({
        where: { userId },
      }),
    ]);

    return {
      withdrawals,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // 계좌 인증
  async verifyBankAccount(userId: string) {
    const wallet = await this.getOrCreateWallet(userId);

    return this.prisma.wallet.update({
      where: { id: wallet.id },
      data: {
        isVerified: true,
        verifiedAt: new Date(),
      },
    });
  }
}