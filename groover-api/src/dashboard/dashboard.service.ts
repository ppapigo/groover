// src/dashboard/dashboard.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ========================================
  // 크리에이터 대시보드
  // ========================================

  async getCreatorStats(userId: string) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // 지갑 정보
    const wallet = await this.prisma.wallet.findUnique({
      where: { userId },
    });

    // 광고 거래 통계
    const [completedDeals, activeDeals, pendingProposals] = await Promise.all([
      this.prisma.adDeal.count({
        where: { creatorId: userId, status: 'SETTLED' },
      }),
      this.prisma.adDeal.count({
        where: { creatorId: userId, status: { in: ['PAID', 'SUBMITTED'] } },
      }),
      this.prisma.adDeal.count({
        where: { creatorId: userId, status: 'PROPOSED' },
      }),
    ]);

    // 이번 달 수익
    const monthlyDeals = await this.prisma.adDeal.aggregate({
      where: {
        creatorId: userId,
        status: 'SETTLED',
        settledAt: { gte: startOfMonth },
      },
      _sum: { creatorAmount: true },
    });

    // 이번 달 통계
    const monthlyStats = await this.prisma.dailyStat.aggregate({
      where: {
        userId,
        date: { gte: startOfMonth },
      },
      _sum: {
        postViews: true,
        partnerClicks: true,
      },
    });

    return {
      totalEarnings: wallet?.totalEarned || 0,
      monthlyEarnings: monthlyDeals._sum.creatorAmount || 0,
      pendingBalance: wallet?.pendingBalance || 0,
      availableBalance: wallet?.balance || 0,
      completedDeals,
      activeDeals,
      pendingProposals,
      monthlyPostViews: monthlyStats._sum.postViews || 0,
      monthlyPartnerClicks: monthlyStats._sum.partnerClicks || 0,
    };
  }

  // ========================================
  // 광고주 대시보드
  // ========================================

  async getAdvertiserStats(userId: string) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // 광고 거래 통계
    const [totalSpentResult, monthlySpentResult, activeDeals, completedDeals, pendingProposals, pendingConfirmation] = await Promise.all([
      this.prisma.adDeal.aggregate({
        where: { advertiserId: userId, status: 'SETTLED' },
        _sum: { totalAmount: true },
      }),
      this.prisma.adDeal.aggregate({
        where: {
          advertiserId: userId,
          status: 'SETTLED',
          settledAt: { gte: startOfMonth },
        },
        _sum: { totalAmount: true },
      }),
      this.prisma.adDeal.count({
        where: { advertiserId: userId, status: { in: ['PAID', 'SUBMITTED'] } },
      }),
      this.prisma.adDeal.count({
        where: { advertiserId: userId, status: 'SETTLED' },
      }),
      this.prisma.adDeal.count({
        where: { advertiserId: userId, status: { in: ['PROPOSED', 'ACCEPTED'] } },
      }),
      this.prisma.adDeal.count({
        where: { advertiserId: userId, status: 'SUBMITTED' },
      }),
    ]);

    return {
      totalSpent: totalSpentResult._sum.totalAmount || 0,
      monthlySpent: monthlySpentResult._sum.totalAmount || 0,
      activeDeals,
      completedDeals,
      pendingProposals,
      pendingConfirmation,
    };
  }

  // ========================================
  // 일별 통계 (기간별)
  // ========================================

  async getStatsRange(userId: string, days: number = 30) {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const stats = await this.prisma.dailyStat.findMany({
      where: {
        userId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { date: 'asc' },
    });

    // 일별 데이터 포맷팅
    const daily = stats.map(stat => ({
      date: stat.date.toISOString().split('T')[0],
      pageViews: stat.pageViews,
      postViews: stat.postViews,
      adImpressions: stat.adImpressions,
      adClicks: stat.adClicks,
      partnerClicks: stat.partnerClicks,
    }));

    // 합계 계산
    const totalViews = stats.reduce((sum, s) => sum + s.pageViews + s.postViews, 0);
    const totalClicks = stats.reduce((sum, s) => sum + s.adClicks + s.partnerClicks, 0);
    const totalImpressions = stats.reduce((sum, s) => sum + s.adImpressions, 0);
    const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;

    return {
      daily,
      totalViews,
      totalClicks,
      ctr: Math.round(ctr * 100) / 100,
    };
  }

  // ========================================
  // 수익 통계 (기간별)
  // ========================================

  async getEarningsRange(userId: string, days: number = 30) {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // 광고 수익 (일별)
    const deals = await this.prisma.adDeal.findMany({
      where: {
        creatorId: userId,
        status: 'SETTLED',
        settledAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        creatorAmount: true,
        settledAt: true,
      },
    });

    // 일별 그룹핑
    const dailyMap = new Map<string, { adEarnings: number; partnerEarnings: number }>();
    
    for (const deal of deals) {
      const date = deal.settledAt!.toISOString().split('T')[0];
      const existing = dailyMap.get(date) || { adEarnings: 0, partnerEarnings: 0 };
      existing.adEarnings += deal.creatorAmount;
      dailyMap.set(date, existing);
    }

    // TODO: 파트너스 수익 추가 (별도 테이블 필요)

    const data = Array.from(dailyMap.entries()).map(([period, earnings]) => ({
      period,
      adEarnings: earnings.adEarnings,
      partnerEarnings: earnings.partnerEarnings,
      total: earnings.adEarnings + earnings.partnerEarnings,
    })).sort((a, b) => a.period.localeCompare(b.period));

    const totalEarnings = data.reduce((sum, d) => sum + d.total, 0);
    const avgDailyEarnings = days > 0 ? Math.round(totalEarnings / days) : 0;

    return {
      data,
      totalEarnings,
      avgDailyEarnings,
    };
  }

  // ========================================
  // 최근 활동 로그
  // ========================================

  async getActivityLogs(userId: string, limit: number = 20) {
    const activities: any[] = [];

    // 광고 거래 활동
    const deals = await this.prisma.adDeal.findMany({
      where: {
        OR: [
          { advertiserId: userId },
          { creatorId: userId },
        ],
      },
      orderBy: { updatedAt: 'desc' },
      take: limit,
      include: {
        advertiser: { select: { name: true } },
        creator: { select: { name: true } },
      },
    });

    for (const deal of deals) {
      const isCreator = deal.creatorId === userId;
      const partnerName = isCreator ? deal.advertiser?.name : deal.creator?.name;

      let type: string;
      let description: string;
      let amount: number | undefined;

      switch (deal.status) {
        case 'PROPOSED':
          type = 'deal_proposed';
          description = isCreator
            ? `${partnerName}님이 광고 제안을 보냈습니다: ${deal.title}`
            : `${partnerName}님에게 광고 제안을 보냈습니다: ${deal.title}`;
          amount = deal.totalAmount;
          break;
        case 'ACCEPTED':
          type = 'deal_accepted';
          description = isCreator
            ? `광고 제안을 수락했습니다: ${deal.title}`
            : `${partnerName}님이 광고 제안을 수락했습니다: ${deal.title}`;
          break;
        case 'PAID':
          type = 'deal_paid';
          description = isCreator
            ? `광고비가 에스크로에 입금되었습니다: ${deal.title}`
            : `광고비를 결제했습니다: ${deal.title}`;
          amount = deal.totalAmount;
          break;
        case 'SUBMITTED':
          type = 'deal_submitted';
          description = isCreator
            ? `콘텐츠를 제출했습니다: ${deal.title}`
            : `${partnerName}님이 콘텐츠를 제출했습니다: ${deal.title}`;
          break;
        case 'SETTLED':
          type = 'deal_settled';
          description = isCreator
            ? `광고비가 정산되었습니다: ${deal.title}`
            : `광고가 완료되었습니다: ${deal.title}`;
          amount = isCreator ? deal.creatorAmount : deal.totalAmount;
          break;
        default:
          continue;
      }

      activities.push({
        id: deal.id,
        type,
        description,
        amount,
        createdAt: deal.updatedAt,
      });
    }

    // 출금 활동
    const withdrawals = await this.prisma.withdrawal.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    for (const withdrawal of withdrawals) {
      activities.push({
        id: withdrawal.id,
        type: 'withdrawal',
        description: `출금 ${withdrawal.status === 'COMPLETED' ? '완료' : withdrawal.status === 'PENDING' ? '요청' : '처리중'}: ${withdrawal.netAmount.toLocaleString()}원`,
        amount: withdrawal.netAmount,
        createdAt: withdrawal.createdAt,
      });
    }

    // 시간순 정렬
    return activities
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  // ========================================
  // 광고 성과 목록
  // ========================================

  async getDealPerformance(userId: string, role: 'creator' | 'advertiser', limit: number = 10) {
    const where = role === 'creator'
      ? { creatorId: userId }
      : { advertiserId: userId };

    const deals = await this.prisma.adDeal.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        advertiser: { select: { name: true } },
        creator: { select: { name: true } },
      },
    });

    return deals.map(deal => ({
      dealId: deal.id,
      title: deal.title,
      partnerName: role === 'creator' 
        ? deal.advertiser?.name || '알 수 없음'
        : deal.creator?.name || '알 수 없음',
      amount: role === 'creator' ? deal.creatorAmount : deal.totalAmount,
      status: deal.status,
      createdAt: deal.createdAt,
      completedAt: deal.settledAt,
    }));
  }

  // ========================================
  // 이벤트 로그 기록 (유틸리티)
  // ========================================

  async logEvent(
    userId: string,
    type: string,
    targetId?: string,
    keyword?: string,
    metadata?: any,
  ) {
    try {
      await this.prisma.eventLog.create({
        data: {
          userId,
          type,
          targetId,
          keyword,
          metadata,
        },
      });
    } catch (error) {
      this.logger.error('이벤트 로그 저장 실패:', error);
    }
  }

  // ========================================
  // 일별 통계 업데이트 (유틸리티)
  // ========================================

  async incrementDailyStat(
    userId: string,
    field: 'pageViews' | 'postViews' | 'adImpressions' | 'adClicks' | 'partnerClicks',
    increment: number = 1,
  ) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    try {
      await this.prisma.dailyStat.upsert({
        where: {
          userId_date: { userId, date: today },
        },
        create: {
          userId,
          date: today,
          [field]: increment,
        },
        update: {
          [field]: { increment },
        },
      });
    } catch (error) {
      this.logger.error('일별 통계 업데이트 실패:', error);
    }
  }
}
