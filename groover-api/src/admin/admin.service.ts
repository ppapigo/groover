// src/admin/admin.service.ts

import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SuspendUserDto, WarnUserDto, ProcessReportDto } from './dto/admin.dto';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ========================================
  // 플랫폼 통계
  // ========================================

  async getPlatformStats() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalUsers,
      newUsersThisMonth,
      totalDeals,
      completedDeals,
      activeDeals,
      totalVolumeResult,
      monthlyVolumeResult,
      pendingReports,
      directTradeAttempts,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({
        where: { createdAt: { gte: startOfMonth } },
      }),
      this.prisma.adDeal.count(),
      this.prisma.adDeal.count({ where: { status: 'SETTLED' } }),
      this.prisma.adDeal.count({
        where: { status: { in: ['PAID', 'SUBMITTED'] } },
      }),
      this.prisma.adDeal.aggregate({
        where: { status: 'SETTLED' },
        _sum: { totalAmount: true, platformFee: true },
      }),
      this.prisma.adDeal.aggregate({
        where: { status: 'SETTLED', settledAt: { gte: startOfMonth } },
        _sum: { totalAmount: true, platformFee: true },
      }),
      this.prisma.dmReport.count({ where: { status: 'PENDING' } }),
      this.prisma.directTradeAttempt.count({
        where: { createdAt: { gte: startOfMonth } },
      }),
    ]);

    const avgDealAmount = completedDeals > 0
      ? Math.round((totalVolumeResult._sum.totalAmount || 0) / completedDeals)
      : 0;

    return {
      totalUsers,
      newUsersThisMonth,
      totalDeals,
      completedDeals,
      activeDeals,
      totalTransactionVolume: totalVolumeResult._sum.totalAmount || 0,
      totalPlatformFees: totalVolumeResult._sum.platformFee || 0,
      monthlyTransactionVolume: monthlyVolumeResult._sum.totalAmount || 0,
      monthlyPlatformFees: monthlyVolumeResult._sum.platformFee || 0,
      avgDealAmount,
      pendingReports,
      directTradeAttempts,
    };
  }

  // ========================================
  // 수익 분석
  // ========================================

  async getRevenueAnalytics(days: number = 30) {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // 이전 기간 (비교용)
    const prevEndDate = new Date(startDate);
    const prevStartDate = new Date();
    prevStartDate.setDate(prevStartDate.getDate() - days * 2);

    // 현재 기간 거래
    const currentDeals = await this.prisma.adDeal.findMany({
      where: {
        status: 'SETTLED',
        settledAt: { gte: startDate, lte: endDate },
      },
      select: { totalAmount: true, platformFee: true, settledAt: true },
    });

    // 이전 기간 거래
    const prevDeals = await this.prisma.adDeal.aggregate({
      where: {
        status: 'SETTLED',
        settledAt: { gte: prevStartDate, lte: prevEndDate },
      },
      _sum: { platformFee: true },
    });

    // 일별 그룹핑
    const dailyMap = new Map<string, { deals: number; volume: number; fees: number }>();
    
    for (const deal of currentDeals) {
      const date = deal.settledAt!.toISOString().split('T')[0];
      const existing = dailyMap.get(date) || { deals: 0, volume: 0, fees: 0 };
      existing.deals += 1;
      existing.volume += deal.totalAmount;
      existing.fees += deal.platformFee;
      dailyMap.set(date, existing);
    }

    // 유저 증가 (일별)
    const newUsers = await this.prisma.user.groupBy({
      by: ['createdAt'],
      where: { createdAt: { gte: startDate, lte: endDate } },
      _count: true,
    });

    const daily = Array.from(dailyMap.entries()).map(([date, data]) => ({
      date,
      newUsers: 0, // 나중에 매핑
      deals: data.deals,
      volume: data.volume,
      fees: data.fees,
    })).sort((a, b) => a.date.localeCompare(b.date));

    const totalRevenue = currentDeals.reduce((sum, d) => sum + d.platformFee, 0);
    const prevRevenue = prevDeals._sum.platformFee || 0;
    const growthRate = prevRevenue > 0
      ? Math.round(((totalRevenue - prevRevenue) / prevRevenue) * 100 * 100) / 100
      : 0;
    const avgDailyRevenue = days > 0 ? Math.round(totalRevenue / days) : 0;

    return {
      daily,
      totalRevenue,
      growthRate,
      avgDailyRevenue,
    };
  }

  // ========================================
  // 유저 관리
  // ========================================

  async getUsers(
    page: number = 1,
    limit: number = 20,
    search?: string,
    filter?: 'all' | 'suspended' | 'warned',
  ) {
    const skip = (page - 1) * limit;

    const where: any = {};
    
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (filter === 'suspended') {
      where.adMatchingSuspended = true;
    } else if (filter === 'warned') {
      where.warningCount = { gt: 0 };
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          name: true,
          profileImageUrl: true,
          warningCount: true,
          adMatchingSuspended: true,
          createdAt: true,
          wallet: { select: { totalEarned: true } },
          _count: { select: { creatorDeals: { where: { status: 'SETTLED' } } } },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      items: users.map(u => ({
        id: u.id,
        email: u.email,
        name: u.name,
        profileImageUrl: u.profileImageUrl,
        warningCount: u.warningCount,
        adMatchingSuspended: u.adMatchingSuspended,
        createdAt: u.createdAt,
        totalEarnings: u.wallet?.totalEarned || 0,
        completedDeals: u._count.creatorDeals,
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getUserDetail(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        wallet: true,
        warnings: { orderBy: { createdAt: 'desc' }, take: 10 },
        directTradeAttempts: { orderBy: { createdAt: 'desc' }, take: 10 },
        creatorDeals: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: {
            advertiser: { select: { id: true, name: true } },
          },
        },
        advertiserDeals: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: {
            creator: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('유저를 찾을 수 없습니다.');
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      profileImageUrl: user.profileImageUrl,
      warningCount: user.warningCount,
      adMatchingSuspended: user.adMatchingSuspended,
      suspendedUntil: user.suspendedUntil,
      createdAt: user.createdAt,
      walletBalance: user.wallet?.balance || 0,
      pendingBalance: user.wallet?.pendingBalance || 0,
      totalEarnings: user.wallet?.totalEarned || 0,
      warnings: user.warnings,
      directTradeAttempts: user.directTradeAttempts,
      recentDeals: [
        ...user.creatorDeals.map(d => ({ ...d, role: 'creator' })),
        ...user.advertiserDeals.map(d => ({ ...d, role: 'advertiser' })),
      ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, 10),
    };
  }

  async suspendUser(userId: string, dto: SuspendUserDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('유저를 찾을 수 없습니다.');
    }

    const suspendedUntil = new Date();
    suspendedUntil.setDate(suspendedUntil.getDate() + dto.days);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { adMatchingSuspended: true, suspendedUntil },
      }),
      this.prisma.userWarning.create({
        data: {
          userId,
          type: 'OTHER',
          reason: `관리자 제재: ${dto.reason} (${dto.days}일 정지)`,
        },
      }),
    ]);

    this.logger.warn(`유저 정지: userId=${userId}, days=${dto.days}`);
    return { success: true, suspendedUntil };
  }

  async unsuspendUser(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { adMatchingSuspended: false, suspendedUntil: null },
    });

    this.logger.log(`유저 정지 해제: userId=${userId}`);
    return { success: true };
  }

  async warnUser(userId: string, dto: WarnUserDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('유저를 찾을 수 없습니다.');
    }

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { warningCount: { increment: 1 } },
      }),
      this.prisma.userWarning.create({
        data: {
          userId,
          type: dto.type as any,
          reason: dto.reason,
        },
      }),
    ]);

    this.logger.warn(`유저 경고: userId=${userId}, type=${dto.type}`);
    return { success: true };
  }

  // ========================================
  // 신고 관리
  // ========================================

  async getReports(
    page: number = 1,
    limit: number = 20,
    status?: string,
  ) {
    const skip = (page - 1) * limit;
    const where: any = {};
    
    if (status) {
      where.status = status;
    }

    const [reports, total] = await Promise.all([
      this.prisma.dmReport.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          reporter: { select: { id: true, name: true, email: true } },
          reported: { select: { id: true, name: true, email: true } },
          message: { select: { content: true } },
        },
      }),
      this.prisma.dmReport.count({ where }),
    ]);

    return {
      items: reports.map(r => ({
        id: r.id,
        reporter: r.reporter,
        reported: r.reported,
        reason: r.reason,
        status: r.status,
        createdAt: r.createdAt,
        messageContent: r.message?.content,
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async processReport(reportId: string, dto: ProcessReportDto) {
    const report = await this.prisma.dmReport.findUnique({
      where: { id: reportId },
    });

    if (!report) {
      throw new NotFoundException('신고를 찾을 수 없습니다.');
    }

    if (report.status !== 'PENDING') {
      throw new BadRequestException('이미 처리된 신고입니다.');
    }

    await this.prisma.dmReport.update({
      where: { id: reportId },
      data: {
        status: dto.status,
        reviewedAt: new Date(),
      },
    });

    // 피신고자 제재
    if (dto.punishUser && dto.status === 'RESOLVED') {
      if (dto.suspendDays) {
        await this.suspendUser(report.reportedId, {
          days: dto.suspendDays,
          reason: `신고 처리: ${report.reason}`,
        });
      } else {
        await this.warnUser(report.reportedId, {
          type: 'ABUSE',
          reason: `신고 처리: ${report.reason}`,
        });
      }
    }

    this.logger.log(`신고 처리: reportId=${reportId}, status=${dto.status}`);
    return { success: true };
  }

  // ========================================
  // 거래 모니터링
  // ========================================

  async getDeals(
    page: number = 1,
    limit: number = 20,
    status?: string,
    overdue?: boolean,
  ) {
    const skip = (page - 1) * limit;
    const where: any = {};
    const now = new Date();

    if (status) {
      where.status = status;
    }

    if (overdue) {
      where.OR = [
        { status: 'PAID', submitDeadline: { lt: now } },
        { status: 'SUBMITTED', confirmDeadline: { lt: now } },
      ];
    }

    const [deals, total] = await Promise.all([
      this.prisma.adDeal.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          advertiser: { select: { id: true, name: true, email: true } },
          creator: { select: { id: true, name: true, email: true } },
        },
      }),
      this.prisma.adDeal.count({ where }),
    ]);

    return {
      items: deals.map(d => ({
        id: d.id,
        advertiser: d.advertiser,
        creator: d.creator,
        title: d.title,
        totalAmount: d.totalAmount,
        platformFee: d.platformFee,
        status: d.status,
        createdAt: d.createdAt,
        submitDeadline: d.submitDeadline,
        confirmDeadline: d.confirmDeadline,
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ========================================
  // 직거래 시도 로그
  // ========================================

  async getDirectTradeLogs(page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      this.prisma.directTradeAttempt.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      }),
      this.prisma.directTradeAttempt.count(),
    ]);

    return {
      items: logs.map(log => ({
        id: log.id,
        user: log.user,
        originalContent: log.originalContent,
        detectedPatterns: log.detectedPatterns,
        detectedTypes: log.detectedTypes,
        createdAt: log.createdAt,
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ========================================
  // 분석 차트 데이터
  // ========================================

  async getDealStatusDistribution() {
    const statuses = await this.prisma.adDeal.groupBy({
      by: ['status'],
      _count: true,
    });

    return statuses.map(s => ({
      status: s.status,
      count: s._count,
    }));
  }

  async getTopCreators(limit: number = 10) {
    const creators = await this.prisma.adDeal.groupBy({
      by: ['creatorId'],
      where: { status: 'SETTLED' },
      _sum: { creatorAmount: true },
      _count: true,
      orderBy: { _sum: { creatorAmount: 'desc' } },
      take: limit,
    });

    const userIds = creators.map(c => c.creatorId);
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, email: true },
    });

    const userMap = new Map(users.map(u => [u.id, u]));

    return creators.map(c => ({
      user: userMap.get(c.creatorId),
      totalEarnings: c._sum.creatorAmount || 0,
      dealCount: c._count,
    }));
  }

  async getTopAdvertisers(limit: number = 10) {
    const advertisers = await this.prisma.adDeal.groupBy({
      by: ['advertiserId'],
      where: { status: 'SETTLED' },
      _sum: { totalAmount: true },
      _count: true,
      orderBy: { _sum: { totalAmount: 'desc' } },
      take: limit,
    });

    const userIds = advertisers.map(a => a.advertiserId);
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, email: true },
    });

    const userMap = new Map(users.map(u => [u.id, u]));

    return advertisers.map(a => ({
      user: userMap.get(a.advertiserId),
      totalSpent: a._sum.totalAmount || 0,
      dealCount: a._count,
    }));
  }
}
