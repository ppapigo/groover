// src/admin/admin.service.ts
import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WarnUserDto, ProcessReportDto } from './dto/admin.dto';

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
      totalPosts,
      publishedPosts,
      pendingReports,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({
        where: { createdAt: { gte: startOfMonth } },
      }),
      this.prisma.post.count(),
      this.prisma.post.count({ where: { status: 'PUBLISHED' } }),
      this.prisma.dmReport.count({ where: { status: 'PENDING' } }),
    ]);

    return {
      totalUsers,
      newUsersThisMonth,
      totalPosts,
      publishedPosts,
      pendingReports,
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
      where.suspendedUntil = { not: null };
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
          suspendedUntil: true,
          createdAt: true,
          _count: { select: { posts: true } },
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
        suspendedUntil: u.suspendedUntil,
        createdAt: u.createdAt,
        postCount: u._count.posts,
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
        warnings: { orderBy: { createdAt: 'desc' }, take: 10 },
        posts: { orderBy: { createdAt: 'desc' }, take: 10 },
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
      suspendedUntil: user.suspendedUntil,
      createdAt: user.createdAt,
      warnings: user.warnings,
      recentPosts: user.posts,
    };
  }

  async suspendUser(userId: string, days: number, reason: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('유저를 찾을 수 없습니다.');
    }

    const suspendedUntil = new Date();
    suspendedUntil.setDate(suspendedUntil.getDate() + days);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { suspendedUntil },
      }),
      this.prisma.userWarning.create({
        data: {
          userId,
          type: 'OTHER',
          reason: `관리자 정지: ${reason} (${days}일 정지)`,
        },
      }),
    ]);

    this.logger.warn(`유저 정지: userId=${userId}, days=${days}`);
    return { success: true, suspendedUntil };
  }

  async unsuspendUser(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { suspendedUntil: null },
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

    // 신고당한 유저 제재
    if (dto.punishUser && dto.status === 'RESOLVED') {
      if (dto.suspendDays) {
        await this.suspendUser(report.reportedId, dto.suspendDays, `신고 처리: ${report.reason}`);
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
  // 게시글 관리
  // ========================================

  async getPosts(
    page: number = 1,
    limit: number = 20,
    status?: string,
  ) {
    const skip = (page - 1) * limit;
    const where: any = {};

    if (status) {
      where.status = status;
    }

    const [posts, total] = await Promise.all([
      this.prisma.post.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      }),
      this.prisma.post.count({ where }),
    ]);

    return {
      items: posts.map(p => ({
        id: p.id,
        title: p.title,
        status: p.status,
        viewCount: p.viewCount,
        likeCount: p.likeCount,
        author: p.user,
        createdAt: p.createdAt,
        publishedAt: p.publishedAt,
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async hidePost(postId: string, reason: string) {
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post) {
      throw new NotFoundException('게시글을 찾을 수 없습니다.');
    }

    await this.prisma.post.update({
      where: { id: postId },
      data: { status: 'HIDDEN' },
    });

    this.logger.warn(`게시글 숨김: postId=${postId}, reason=${reason}`);
    return { success: true };
  }

  async deletePost(postId: string, reason: string) {
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post) {
      throw new NotFoundException('게시글을 찾을 수 없습니다.');
    }

    await this.prisma.post.delete({ where: { id: postId } });

    this.logger.warn(`게시글 삭제: postId=${postId}, reason=${reason}`);
    return { success: true };
  }
}