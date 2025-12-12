// src/tags/tags.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TagsService {
  constructor(private prisma: PrismaService) {}

  // ==================== FEED TAGS (정규화된 피드용 태그) ====================

  // 모든 피드 태그 조회
  async getAllFeedTags(category?: string) {
    return this.prisma.feedTag.findMany({
      where: {
        isActive: true,
        ...(category && { category }),
      },
      orderBy: { postCount: 'desc' },
    });
  }

  // 인기 피드 태그 조회
  async getPopularFeedTags(limit: number = 10) {
    return this.prisma.feedTag.findMany({
      where: { isActive: true },
      orderBy: { postCount: 'desc' },
      take: limit,
    });
  }

  // 피드 태그 상세 조회
  async getFeedTagBySlug(slug: string) {
    const tag = await this.prisma.feedTag.findUnique({
      where: { slug },
    });
    if (!tag) throw new NotFoundException('태그를 찾을 수 없습니다');
    return tag;
  }

  // 피드 태그 생성 (관리자용)
  async createFeedTag(data: {
    name: string;
    slug: string;
    category?: string;
    description?: string;
    iconEmoji?: string;
  }) {
    return this.prisma.feedTag.create({ data });
  }

  // ==================== FREE TAGS (검색용 자유 태그) ====================

  // 자유 태그 검색 (자동완성용)
  async searchFreeTags(query: string, limit: number = 10) {
    return this.prisma.freeTag.findMany({
      where: {
        name: { contains: query, mode: 'insensitive' },
      },
      orderBy: { useCount: 'desc' },
      take: limit,
    });
  }

  // 자유 태그 생성 또는 useCount 증가
  async findOrCreateFreeTag(name: string) {
    const existing = await this.prisma.freeTag.findUnique({
      where: { name },
    });

    if (existing) {
      return this.prisma.freeTag.update({
        where: { id: existing.id },
        data: { useCount: { increment: 1 } },
      });
    }

    return this.prisma.freeTag.create({
      data: { name },
    });
  }

  // ==================== TAG MAPPING (검색태그 → 피드태그) ====================

  // 자유 태그에 매핑된 피드 태그 조회
  async getMappedFeedTags(freeTagId: string) {
    const mappings = await this.prisma.tagMapping.findMany({
      where: { freeTagId },
      include: { feedTag: true },
      orderBy: { confidence: 'desc' },
    });
    return mappings.map((m) => m.feedTag);
  }

  // 매핑 생성 (관리자용)
  async createTagMapping(freeTagId: string, feedTagId: string, confidence: number = 1.0) {
    return this.prisma.tagMapping.create({
      data: { freeTagId, feedTagId, confidence },
    });
  }

  // ==================== USER PINNED TAGS (유저가 핀한 태그) ====================

  // 유저의 핀한 태그 조회
  async getUserPinnedTags(userId: string) {
    const pinned = await this.prisma.userPinnedTag.findMany({
      where: { userId },
      include: { feedTag: true },
      orderBy: { order: 'asc' },
    });
    return pinned.map((p) => p.feedTag);
  }

  // 태그 핀하기
  async pinTag(userId: string, feedTagId: string) {
    // 이미 핀했는지 확인
    const existing = await this.prisma.userPinnedTag.findUnique({
      where: { userId_feedTagId: { userId, feedTagId } },
    });
    if (existing) {
      throw new BadRequestException('이미 핀한 태그입니다');
    }

    // 현재 핀 개수 확인 (최대 20개)
    const count = await this.prisma.userPinnedTag.count({ where: { userId } });
    if (count >= 20) {
      throw new BadRequestException('최대 20개까지 핀할 수 있습니다');
    }

    return this.prisma.userPinnedTag.create({
      data: {
        userId,
        feedTagId,
        order: count,
      },
      include: { feedTag: true },
    });
  }

  // 태그 핀 해제
  async unpinTag(userId: string, feedTagId: string) {
    const existing = await this.prisma.userPinnedTag.findUnique({
      where: { userId_feedTagId: { userId, feedTagId } },
    });
    if (!existing) {
      throw new NotFoundException('핀한 태그가 아닙니다');
    }

    return this.prisma.userPinnedTag.delete({
      where: { id: existing.id },
    });
  }

  // 핀 순서 변경
  async reorderPinnedTags(userId: string, tagIds: string[]) {
    const updates = tagIds.map((feedTagId, index) =>
      this.prisma.userPinnedTag.updateMany({
        where: { userId, feedTagId },
        data: { order: index },
      }),
    );
    await this.prisma.$transaction(updates);
    return this.getUserPinnedTags(userId);
  }

  // ==================== FEED (핀한 태그 기반 피드) ====================

  // 핀한 태그 기반 글 조회
  async getPinnedTagFeed(userId: string, cursor?: string, limit: number = 20) {
    // 유저가 핀한 태그 ID들
    const pinnedTags = await this.prisma.userPinnedTag.findMany({
      where: { userId },
      select: { feedTagId: true },
    });
    const feedTagIds = pinnedTags.map((p) => p.feedTagId);

    if (feedTagIds.length === 0) {
      return { posts: [], nextCursor: null };
    }

    const posts = await this.prisma.post.findMany({
      where: {
        status: 'PUBLISHED',
        feedTags: {
          some: { feedTagId: { in: feedTagIds } },
        },
      },
      include: {
        user: { select: { id: true, name: true, profileImageUrl: true } },
        feedTags: { include: { feedTag: true } },
      },
      orderBy: { publishedAt: 'desc' },
      take: limit + 1,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
    });

    const hasMore = posts.length > limit;
    const results = hasMore ? posts.slice(0, -1) : posts;

    return {
      posts: results,
      nextCursor: hasMore ? results[results.length - 1].id : null,
    };
  }

  // 특정 피드 태그의 글 조회
  async getPostsByFeedTag(slug: string, cursor?: string, limit: number = 20) {
    const tag = await this.prisma.feedTag.findUnique({ where: { slug } });
    if (!tag) throw new NotFoundException('태그를 찾을 수 없습니다');

    const posts = await this.prisma.post.findMany({
      where: {
        status: 'PUBLISHED',
        feedTags: { some: { feedTagId: tag.id } },
      },
      include: {
        user: { select: { id: true, name: true, profileImageUrl: true } },
        feedTags: { include: { feedTag: true } },
      },
      orderBy: { publishedAt: 'desc' },
      take: limit + 1,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
    });

    const hasMore = posts.length > limit;
    const results = hasMore ? posts.slice(0, -1) : posts;

    return {
      tag,
      posts: results,
      nextCursor: hasMore ? results[results.length - 1].id : null,
    };
  }
}