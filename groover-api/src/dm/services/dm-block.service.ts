// src/dm/services/dm-block.service.ts
import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DmBlockService {
  private readonly logger = new Logger(DmBlockService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 사용자 차단
   */
  async blockUser(blockerId: string, blockedId: string) {
    // 자기 자신 차단 불가
    if (blockerId === blockedId) {
      throw new BadRequestException('자기 자신을 차단할 수 없습니다.');
    }

    // 상대방 존재 확인
    const targetUser = await this.prisma.user.findUnique({
      where: { id: blockedId },
    });
    if (!targetUser) {
      throw new NotFoundException('사용자를 찾을 수 없습니다.');
    }

    // 이미 차단했는지 확인
    const existingBlock = await this.prisma.dmBlock.findUnique({
      where: {
        blockerId_blockedId: { blockerId, blockedId },
      },
    });

    if (existingBlock) {
      throw new BadRequestException('이미 차단한 사용자입니다.');
    }

    // 차단 생성
    await this.prisma.dmBlock.create({
      data: { blockerId, blockedId },
    });

    this.logger.log(`User ${blockerId} blocked ${blockedId}`);
  }

  /**
   * 차단 해제
   */
  async unblockUser(blockerId: string, blockedId: string) {
    const block = await this.prisma.dmBlock.findUnique({
      where: {
        blockerId_blockedId: { blockerId, blockedId },
      },
    });

    if (!block) {
      throw new BadRequestException('차단하지 않은 사용자입니다.');
    }

    await this.prisma.dmBlock.delete({
      where: { id: block.id },
    });

    this.logger.log(`User ${blockerId} unblocked ${blockedId}`);
  }

  /**
   * 차단 여부 확인 (양방향)
   * - 내가 상대를 차단했거나
   * - 상대가 나를 차단한 경우
   */
  async isBlocked(userId1: string, userId2: string): Promise<boolean> {
    const block = await this.prisma.dmBlock.findFirst({
      where: {
        OR: [
          { blockerId: userId1, blockedId: userId2 },
          { blockerId: userId2, blockedId: userId1 },
        ],
      },
    });

    return !!block;
  }

  /**
   * 내가 차단한 사용자인지 확인
   */
  async didIBlock(blockerId: string, blockedId: string): Promise<boolean> {
    const block = await this.prisma.dmBlock.findUnique({
      where: {
        blockerId_blockedId: { blockerId, blockedId },
      },
    });

    return !!block;
  }

  /**
   * 차단 목록 조회
   */
  async getBlockedUsers(userId: string) {
    const blocks = await this.prisma.dmBlock.findMany({
      where: { blockerId: userId },
      include: {
        blocked: {
          select: { id: true, name: true, profileImage: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return blocks.map(block => ({
      id: block.id,
      user: block.blocked,
      blockedAt: block.createdAt,
    }));
  }
}
