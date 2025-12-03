// src/dm/services/dm-report.service.ts
import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ReportMessageDto } from '../dto';

@Injectable()
export class DmReportService {
  private readonly logger = new Logger(DmReportService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 사용자/메시지 신고
   */
  async reportUser(reporterId: string, dto: ReportMessageDto) {
    // 자기 자신 신고 불가
    if (reporterId === dto.targetUserId) {
      throw new BadRequestException('자기 자신을 신고할 수 없습니다.');
    }

    // 상대방 존재 확인
    const targetUser = await this.prisma.user.findUnique({
      where: { id: dto.targetUserId },
    });
    if (!targetUser) {
      throw new NotFoundException('사용자를 찾을 수 없습니다.');
    }

    // 메시지 신고인 경우 메시지 확인
    if (dto.messageId) {
      const message = await this.prisma.dmMessage.findUnique({
        where: { id: dto.messageId },
      });
      if (!message) {
        throw new NotFoundException('메시지를 찾을 수 없습니다.');
      }
      if (message.senderId !== dto.targetUserId) {
        throw new BadRequestException('해당 메시지의 발신자가 아닙니다.');
      }
    }

    // 중복 신고 확인 (같은 메시지에 대해)
    if (dto.messageId) {
      const existingReport = await this.prisma.dmReport.findFirst({
        where: {
          reporterId,
          messageId: dto.messageId,
        },
      });
      if (existingReport) {
        throw new BadRequestException('이미 신고한 메시지입니다.');
      }
    }

    // 신고 생성
    const report = await this.prisma.dmReport.create({
      data: {
        reporterId,
        reportedId: dto.targetUserId,
        messageId: dto.messageId,
        reason: dto.reason,
      },
    });

    this.logger.log(`Report created: ${report.id} (Reporter: ${reporterId}, Reported: ${dto.targetUserId})`);

    return report;
  }

  /**
   * 신고 목록 조회 (관리자용)
   */
  async getReports(status?: string, limit: number = 50, cursor?: string) {
    const reports = await this.prisma.dmReport.findMany({
      where: status ? { status } : undefined,
      include: {
        reporter: { select: { id: true, name: true, email: true } },
        reported: { select: { id: true, name: true, email: true } },
        message: { select: { id: true, content: true, createdAt: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      ...(cursor && {
        cursor: { id: cursor },
        skip: 1,
      }),
    });

    const hasMore = reports.length > limit;
    const items = hasMore ? reports.slice(0, -1) : reports;

    return {
      items,
      nextCursor: hasMore ? items[items.length - 1].id : null,
      hasMore,
    };
  }

  /**
   * 신고 처리 (관리자용)
   */
  async resolveReport(
    reportId: string,
    resolution: 'RESOLVED' | 'DISMISSED',
    adminId: string,
  ) {
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
        status: resolution,
        reviewedAt: new Date(),
      },
    });

    this.logger.log(`Report ${reportId} ${resolution} by admin ${adminId}`);

    return { success: true };
  }

  /**
   * 신고 통계 (관리자용)
   */
  async getReportStats() {
    const [total, pending, resolved, dismissed] = await Promise.all([
      this.prisma.dmReport.count(),
      this.prisma.dmReport.count({ where: { status: 'PENDING' } }),
      this.prisma.dmReport.count({ where: { status: 'RESOLVED' } }),
      this.prisma.dmReport.count({ where: { status: 'DISMISSED' } }),
    ]);

    return {
      total,
      pending,
      resolved,
      dismissed,
    };
  }
}
