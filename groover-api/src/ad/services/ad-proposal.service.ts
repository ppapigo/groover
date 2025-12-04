// src/ad/services/ad-proposal.service.ts
import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAdProposalDto, RespondProposalDto } from '../dto';

@Injectable()
export class AdProposalService {
  private readonly logger = new Logger(AdProposalService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 광고 제안 생성 (광고주 → 크리에이터)
   */
  async createProposal(advertiserId: string, dto: CreateAdProposalDto) {
    // 자기 자신에게 제안 불가
    if (advertiserId === dto.creatorId) {
      throw new BadRequestException('자기 자신에게 광고 제안을 보낼 수 없습니다.');
    }

    // 크리에이터 존재 확인
    const creator = await this.prisma.user.findUnique({
      where: { id: dto.creatorId },
    });
    if (!creator) {
      throw new NotFoundException('사용자를 찾을 수 없습니다.');
    }

    // DM 스레드 생성/조회
    const [user1Id, user2Id] = [advertiserId, dto.creatorId].sort();
    let thread = await this.prisma.dmThread.findUnique({
      where: { user1Id_user2Id: { user1Id, user2Id } },
    });

    if (!thread) {
      thread = await this.prisma.dmThread.create({
        data: { user1Id, user2Id },
      });
    }

    // 광고 제안 생성
    const proposal = await this.prisma.adProposal.create({
      data: {
        advertiserId,
        creatorId: dto.creatorId,
        threadId: thread.id,
        title: dto.title,
        description: dto.description,
        budget: dto.budget,
        requirements: dto.requirements,
        deadline: dto.deadline ? new Date(dto.deadline) : null,
      },
      include: {
        advertiser: { select: { id: true, name: true, profileImageUrl: true } },
        creator: { select: { id: true, name: true, profileImageUrl: true } },
      },
    });

    // 시스템 메시지로 DM에 알림
    await this.prisma.dmMessage.create({
      data: {
        threadId: thread.id,
        senderId: advertiserId,
        content: `[광고 제안] ${dto.title}\n예산: ${dto.budget.toLocaleString()}원`,
        messageType: 'system',
        metadata: {
          type: 'ad_proposal',
          proposalId: proposal.id,
        },
      },
    });

    this.logger.log(`Ad proposal created: ${proposal.id}`);
    return proposal;
  }

  /**
   * 제안 응답 (수락/거절)
   */
  async respondToProposal(
    creatorId: string,
    proposalId: string,
    dto: RespondProposalDto,
  ) {
    const proposal = await this.prisma.adProposal.findUnique({
      where: { id: proposalId },
      include: { thread: true },
    });

    if (!proposal) {
      throw new NotFoundException('광고 제안을 찾을 수 없습니다.');
    }

    if (proposal.creatorId !== creatorId) {
      throw new ForbiddenException('이 제안에 응답할 권한이 없습니다.');
    }

    if (proposal.status !== 'PENDING') {
      throw new BadRequestException('이미 응답한 제안입니다.');
    }

    const newStatus = dto.response === 'ACCEPTED' ? 'ACCEPTED' : 'REJECTED';

    const updated = await this.prisma.adProposal.update({
      where: { id: proposalId },
      data: {
        status: newStatus,
        respondedAt: new Date(),
      },
      include: {
        advertiser: { select: { id: true, name: true } },
        creator: { select: { id: true, name: true } },
      },
    });

    // DM으로 결과 알림
    if (proposal.threadId) {
      const message = dto.response === 'ACCEPTED'
        ? `[광고 제안 수락] "${proposal.title}" 제안을 수락했습니다. 광고주의 결제를 기다리고 있습니다.`
        : `[광고 제안 거절] "${proposal.title}" 제안을 거절했습니다.${dto.message ? `\n사유: ${dto.message}` : ''}`;

      await this.prisma.dmMessage.create({
        data: {
          threadId: proposal.threadId,
          senderId: creatorId,
          content: message,
          messageType: 'system',
          metadata: {
            type: 'ad_proposal_response',
            proposalId: proposal.id,
            response: dto.response,
          },
        },
      });
    }

    this.logger.log(`Proposal ${proposalId} ${newStatus}`);
    return updated;
  }

  /**
   * 내 제안 목록 (보낸/받은)
   */
  async getMyProposals(
    userId: string,
    type: 'sent' | 'received',
    status?: string,
    cursor?: string,
    limit: number = 20,
  ) {
    const where = type === 'sent'
      ? { advertiserId: userId }
      : { creatorId: userId };

    const proposals = await this.prisma.adProposal.findMany({
      where: {
        ...where,
        ...(status && { status: status as any }),
      },
      include: {
        advertiser: { select: { id: true, name: true, profileImageUrl: true } },
        creator: { select: { id: true, name: true, profileImageUrl: true } },
        payment: {
          select: { id: true, status: true, amount: true, paidAt: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      ...(cursor && {
        cursor: { id: cursor },
        skip: 1,
      }),
    });

    const hasMore = proposals.length > limit;
    const items = hasMore ? proposals.slice(0, -1) : proposals;

    return {
      items,
      nextCursor: hasMore ? items[items.length - 1].id : null,
      hasMore,
    };
  }

  /**
   * 제안 상세
   */
  async getProposal(userId: string, proposalId: string) {
    const proposal = await this.prisma.adProposal.findUnique({
      where: { id: proposalId },
      include: {
        advertiser: { select: { id: true, name: true, profileImageUrl: true, email: true } },
        creator: { select: { id: true, name: true, profileImageUrl: true } },
        payment: true,
        thread: true,
      },
    });

    if (!proposal) {
      throw new NotFoundException('광고 제안을 찾을 수 없습니다.');
    }

    // 관련자만 조회 가능
    if (proposal.advertiserId !== userId && proposal.creatorId !== userId) {
      throw new ForbiddenException('접근 권한이 없습니다.');
    }

    return proposal;
  }

  /**
   * 작업 완료 처리
   */
  async markAsCompleted(creatorId: string, proposalId: string) {
    const proposal = await this.prisma.adProposal.findUnique({
      where: { id: proposalId },
      include: { payment: true },
    });

    if (!proposal) {
      throw new NotFoundException('광고 제안을 찾을 수 없습니다.');
    }

    if (proposal.creatorId !== creatorId) {
      throw new ForbiddenException('권한이 없습니다.');
    }

    if (proposal.status !== 'IN_PROGRESS') {
      throw new BadRequestException('진행 중인 제안만 완료 처리할 수 있습니다.');
    }

    const updated = await this.prisma.adProposal.update({
      where: { id: proposalId },
      data: { status: 'COMPLETED' },
    });

    this.logger.log(`Proposal ${proposalId} completed`);
    return updated;
  }
}
