// src/blog/blog.service.ts
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { FeedQueryDto } from './dto/feed-query.dto';

@Injectable()
export class BlogService {
  private readonly logger = new Logger(BlogService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ========================================
  // 글 작성/수정/삭제
  // ========================================

  async createPost(userId: string, dto: CreatePostDto) {
    const slug = await this.generateSlug(dto.title);
    const previewImage = dto.previewImage || this.extractFirstImage(dto.content);
    const excerpt = dto.excerpt || this.generateExcerpt(dto.content);

    const post = await this.prisma.post.create({
      data: {
        userId,
        title: dto.title,
        content: dto.content,
        previewImage,
        tags: dto.tags || [],
        metadata: dto.metadata as any || null,
        slug,
        excerpt,
        status: dto.publish ? 'PUBLISHED' : 'DRAFT',
        publishedAt: dto.publish ? new Date() : null,
      },
      include: {
        user: { select: { id: true, name: true } },
      },
    });

    this.logger.log(`Post created: ${post.id} by user ${userId}`);
    return this.formatPost(post);
  }

  async updatePost(postId: string, userId: string, dto: UpdatePostDto) {
  const existingPost = await this.prisma.post.findUnique({
    where: { id: postId },
  });

  if (!existingPost) {
    throw new NotFoundException('글을 찾을 수 없습니다.');
  }

  if (existingPost.userId !== userId) {
    throw new ForbiddenException('본인의 글만 수정할 수 있습니다.');
  }

  let updateData: any = { ...dto };

  if (dto.title && dto.title !== existingPost.title) {
    updateData.slug = await this.generateSlug(dto.title, postId);
  }

  // metadata 타입 호환성 처리
  if (dto.metadata !== undefined) {
    updateData.metadata = dto.metadata as any;
  }

  const post = await this.prisma.post.update({
    where: { id: postId },
    data: updateData,
    include: {
      user: { select: { id: true, name: true } },
    },
  });

  return this.formatPost(post);
}
  async deletePost(postId: string, userId: string) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post) {
      throw new NotFoundException('글을 찾을 수 없습니다.');
    }

    if (post.userId !== userId) {
      throw new ForbiddenException('본인의 글만 삭제할 수 있습니다.');
    }

    await this.prisma.post.delete({ where: { id: postId } });
    this.logger.log(`Post deleted: ${postId} by user ${userId}`);
  }

  async publishPost(postId: string, userId: string, publish: boolean) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post) {
      throw new NotFoundException('글을 찾을 수 없습니다.');
    }

    if (post.userId !== userId) {
      throw new ForbiddenException('본인의 글만 발행할 수 있습니다.');
    }

    return this.prisma.post.update({
      where: { id: postId },
      data: {
        status: publish ? 'PUBLISHED' : 'DRAFT',
        publishedAt: publish ? new Date() : null,
      },
    });
  }

  // ========================================
  // 피드
  // ========================================

  async getFeed(query: FeedQueryDto, userId?: string) {
    const { cursor, limit = 20 } = query;

    const where: any = { status: 'PUBLISHED' };

    if (cursor) {
      where.publishedAt = { lt: new Date(cursor) };
    }

    const posts = await this.prisma.post.findMany({
      where,
      take: limit + 1,
      orderBy: { publishedAt: 'desc' },
      include: {
        user: { select: { id: true, name: true } },
        _count: { select: { likes: true } },
      },
    });

    const hasMore = posts.length > limit;
    const items = hasMore ? posts.slice(0, -1) : posts;
    const nextCursor = hasMore
      ? items[items.length - 1].publishedAt?.toISOString()
      : null;

    return {
      items: items.map(post => this.formatFeedItem(post, userId)),
      nextCursor,
      hasMore,
    };
  }

  async getPopularFeed(query: FeedQueryDto, userId?: string) {
    const { limit = 20 } = query;

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const posts = await this.prisma.post.findMany({
      where: {
        status: 'PUBLISHED',
        publishedAt: { gte: weekAgo },
      },
      take: limit,
      orderBy: [
        { likeCount: 'desc' },
        { viewCount: 'desc' },
      ],
      include: {
        user: { select: { id: true, name: true } },
        _count: { select: { likes: true } },
      },
    });

    return {
      items: posts.map(post => this.formatFeedItem(post, userId)),
      nextCursor: null,
      hasMore: false,
    };
  }

  async getTagFeed(tag: string, query: FeedQueryDto, userId?: string) {
    const { cursor, limit = 20 } = query;

    const where: any = {
      status: 'PUBLISHED',
      tags: { has: tag },
    };

    if (cursor) {
      where.publishedAt = { lt: new Date(cursor) };
    }

    const posts = await this.prisma.post.findMany({
      where,
      take: limit + 1,
      orderBy: { publishedAt: 'desc' },
      include: {
        user: { select: { id: true, name: true } },
        _count: { select: { likes: true } },
      },
    });

    const hasMore = posts.length > limit;
    const items = hasMore ? posts.slice(0, -1) : posts;
    const nextCursor = hasMore
      ? items[items.length - 1].publishedAt?.toISOString()
      : null;

    return {
      items: items.map(post => this.formatFeedItem(post, userId)),
      nextCursor,
      hasMore,
    };
  }

  // ========================================
  // 글 상세
  // ========================================

  async getPostBySlug(slug: string, userId?: string) {
    const post = await this.prisma.post.findUnique({
      where: { slug },
      include: {
        user: { select: { id: true, name: true } },
        _count: { select: { likes: true } },
        likes: userId ? { where: { userId }, take: 1 } : false,
      },
    });

    if (!post) {
      throw new NotFoundException('글을 찾을 수 없습니다.');
    }

    if (post.status !== 'PUBLISHED' && post.userId !== userId) {
      throw new NotFoundException('글을 찾을 수 없습니다.');
    }

    this.prisma.post.update({
      where: { id: post.id },
      data: { viewCount: { increment: 1 } },
    }).catch(() => {});

    return this.formatPostDetail(post, userId);
  }

  async getRelatedPosts(postId: string, limit: number = 5, userId?: string) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      select: { tags: true, userId: true },
    });

    if (!post) {
      throw new NotFoundException('글을 찾을 수 없습니다.');
    }

    const relatedPosts = await this.prisma.post.findMany({
      where: {
        id: { not: postId },
        status: 'PUBLISHED',
        OR: [
          { tags: { hasSome: post.tags } },
          { userId: post.userId },
        ],
      },
      take: limit,
      orderBy: { publishedAt: 'desc' },
      include: {
        user: { select: { id: true, name: true } },
        _count: { select: { likes: true } },
      },
    });

    return relatedPosts.map(p => this.formatFeedItem(p, userId));
  }

  // ========================================
  // 좋아요
  // ========================================

  async toggleLike(postId: string, userId: string) {
    const existingLike = await this.prisma.postLike.findUnique({
      where: { postId_userId: { postId, userId } },
    });

    if (existingLike) {
      await this.prisma.$transaction([
        this.prisma.postLike.delete({ where: { id: existingLike.id } }),
        this.prisma.post.update({
          where: { id: postId },
          data: { likeCount: { decrement: 1 } },
        }),
      ]);
      return { liked: false };
    } else {
      await this.prisma.$transaction([
        this.prisma.postLike.create({ data: { postId, userId } }),
        this.prisma.post.update({
          where: { id: postId },
          data: { likeCount: { increment: 1 } },
        }),
      ]);
      return { liked: true };
    }
  }

  // ========================================
  // 내 글 관리
  // ========================================

  async getMyPosts(userId: string, query: FeedQueryDto) {
    const { cursor, limit = 20 } = query;

    const where: any = { userId };

    if (cursor) {
      where.createdAt = { lt: new Date(cursor) };
    }

    const posts = await this.prisma.post.findMany({
      where,
      take: limit + 1,
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { likes: true } } },
    });

    const hasMore = posts.length > limit;
    const items = hasMore ? posts.slice(0, -1) : posts;
    const nextCursor = hasMore
      ? items[items.length - 1].createdAt.toISOString()
      : null;

    return {
      items: items.map(post => this.formatFeedItem(post, userId)),
      nextCursor,
      hasMore,
    };
  }

  async getMyDrafts(userId: string) {
    return this.prisma.post.findMany({
      where: { userId, status: 'DRAFT' },
      orderBy: { updatedAt: 'desc' },
    });
  }

  // ========================================
  // 공유
  // ========================================

  async sharePost(postId: string, userId?: string, platform?: string) {
    const post = await this.prisma.post.findUnique({ where: { id: postId } });

    if (!post) {
      throw new NotFoundException('게시글을 찾을 수 없습니다');
    }

    await this.prisma.$transaction([
      this.prisma.postShare.create({
        data: {
          postId,
          userId: userId || null,
          platform: platform || 'unknown',
        },
      }),
      this.prisma.post.update({
        where: { id: postId },
        data: { shareCount: { increment: 1 } },
      }),
    ]);

    return { message: '공유되었습니다' };
  }

  async getPostStats(postId: string) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      select: { id: true, viewCount: true, likeCount: true, shareCount: true },
    });

    if (!post) {
      throw new NotFoundException('게시글을 찾을 수 없습니다');
    }

    return {
      postId: post.id,
      views: post.viewCount,
      likes: post.likeCount,
      shares: post.shareCount,
    };
  }

  // ========================================
  // 헬퍼 메서드
  // ========================================

  private async generateSlug(title: string, excludeId?: string): Promise<string> {
    let slug = title
      .toLowerCase()
      .replace(/[^a-z0-9가-힣\s]/g, '')
      .replace(/\s+/g, '-')
      .slice(0, 50);

    slug = `${slug}-${this.generateRandomString(6)}`;

    const existing = await this.prisma.post.findUnique({ where: { slug } });

    if (existing && existing.id !== excludeId) {
      return this.generateSlug(title, excludeId);
    }

    return slug;
  }

  private generateRandomString(length: number): string {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    return Array.from({ length }, () =>
      chars[Math.floor(Math.random() * chars.length)]
    ).join('');
  }

  private extractFirstImage(content: string): string | null {
    const imgMatch = content.match(/<img[^>]+src=["']([^"']+)["']/i);
    if (imgMatch) return imgMatch[1];

    const mdMatch = content.match(/!\[.*?\]\(([^)]+)\)/);
    if (mdMatch) return mdMatch[1];

    return null;
  }

 private generateExcerpt(content: string, maxLength: number = 150): string {
  let text = content;
  
  // 마크다운 이미지 제거 ![...](url)
  text = text.replace(/!\[[^\]]*\]\([^)]*\)/g, '');
  
  // HTML 태그 제거
  text = text.replace(/<[^>]+>/g, '');
  
  // 마크다운 링크 텍스트만 남기기 [text](url) -> text
  text = text.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1');
  
  // URL 제거
  text = text.replace(/https?:\/\/[^\s]+/g, '');
  
  // 공백 정리
  text = text.replace(/\s+/g, ' ').trim();
  
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + '...';
}
  private formatPost(post: any) {
    return {
      id: post.id,
      title: post.title,
      content: post.content,
      previewImage: post.previewImage,
      tags: post.tags,
      metadata: post.metadata, // 메타데이터 포함
      slug: post.slug,
      excerpt: post.excerpt,
      status: post.status,
      viewCount: post.viewCount,
      likeCount: post.likeCount,
      author: post.user,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
      publishedAt: post.publishedAt,
    };
  }

  private formatPostDetail(post: any, userId?: string) {
    const isLiked = post.likes?.length > 0;

    return {
      id: post.id,
      title: post.title,
      content: post.content,
      previewImage: post.previewImage,
      tags: post.tags,
      metadata: post.metadata, // 메타데이터 포함
      slug: post.slug,
      status: post.status,
      viewCount: post.viewCount,
      likeCount: post._count?.likes || post.likeCount,
      isLiked,
      isOwner: post.userId === userId,
      author: post.user,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
      publishedAt: post.publishedAt,
    };
  }

  private formatFeedItem(post: any, userId?: string) {
    return {
      id: post.id,
      title: post.title,
      previewImage: post.previewImage,
      excerpt: post.excerpt,
      slug: post.slug,
      tags: post.tags,
      metadata: post.metadata, // 메타데이터 포함 (피드에서 구매상태, 요약 표시용)
      status: post.status,
      viewCount: post.viewCount,
      likeCount: post._count?.likes || post.likeCount,
      commentCount: post.commentCount || 0,
      author: post.user,
      publishedAt: post.publishedAt,
    };
  }

  // ========================================
  // 추천 피드
  // ========================================

  async getRecommendedFeed(query: FeedQueryDto, userId?: string) {
    const { cursor, limit = 20 } = query;

    let userPreferences: { tags: string[] } = { tags: [] };

    if (userId) {
      userPreferences = await this.getUserPreferences(userId);
    }

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const posts = await this.prisma.post.findMany({
      where: {
        status: 'PUBLISHED',
        publishedAt: { gte: thirtyDaysAgo },
      },
      take: 200,
      orderBy: { publishedAt: 'desc' },
      include: {
        user: { select: { id: true, name: true } },
        _count: { select: { likes: true } },
      },
    });

    const scoredPosts = posts.map(post => {
      const score = this.calculatePostScore(post, userPreferences);
      return { ...post, score };
    });

    scoredPosts.sort((a, b) => b.score - a.score);

    let startIndex = 0;
    if (cursor) {
      const cursorIndex = scoredPosts.findIndex(p => p.id === cursor);
      if (cursorIndex !== -1) {
        startIndex = cursorIndex + 1;
      }
    }

    const items = scoredPosts.slice(startIndex, startIndex + limit);
    const hasMore = startIndex + limit < scoredPosts.length;
    const nextCursor = hasMore ? items[items.length - 1].id : null;

    return {
      items: items.map(post => ({
        ...this.formatFeedItem(post, userId),
        score: post.score,
      })),
      nextCursor,
      hasMore,
    };
  }

  private calculatePostScore(
    post: any,
    userPreferences: { tags: string[] }
  ): number {
    const now = new Date();
    const publishedAt = new Date(post.publishedAt);
    const hoursSincePublished = (now.getTime() - publishedAt.getTime()) / (1000 * 60 * 60);
    const recencyScore = Math.max(0, 1 - (hoursSincePublished / (24 * 30)));

    const viewScore = Math.log10(post.viewCount + 1) / 5;
    const likeScore = Math.min(1, (post.likeCount || post._count?.likes || 0) / 100);

    let tagMatchScore = 0;
    if (userPreferences.tags.length > 0 && post.tags?.length > 0) {
      const matchCount = post.tags.filter((tag: string) =>
        userPreferences.tags.includes(tag)
      ).length;
      tagMatchScore = matchCount / Math.max(post.tags.length, userPreferences.tags.length);
    }

    const score = (0.3 * recencyScore) + (0.2 * viewScore) + (0.3 * likeScore) + (0.2 * tagMatchScore);
    return Math.round(score * 1000) / 1000;
  }

  private async getUserPreferences(userId: string): Promise<{ tags: string[] }> {
    const recentViews = await this.prisma.userPostHistory.findMany({
      where: { userId },
      orderBy: { viewedAt: 'desc' },
      take: 50,
      include: {
        post: { select: { tags: true } },
      },
    });

    const tagCounts: Record<string, number> = {};
    recentViews.forEach(view => {
      view.post.tags?.forEach((tag: string) => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
    });

    const topTags = Object.entries(tagCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([tag]) => tag);

    return { tags: topTags };
  }

  async recordPostView(postId: string, userId: string) {
    try {
      await this.prisma.userPostHistory.upsert({
        where: { userId_postId: { userId, postId } },
        update: { viewedAt: new Date() },
        create: { userId, postId },
      });
    } catch (error) {
      this.logger.warn(`Failed to record post view: ${error}`);
    }
  }
  // src/blog/blog.service.ts - 맨 아래에 추가

  // ========================================
  // 댓글
  // ========================================

  async getComments(postId: string) {
    // postId가 UUID인지 slug인지 확인
    let post;
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(postId);
    
    if (isUUID) {
      post = await this.prisma.post.findUnique({ where: { id: postId } });
    } else {
      post = await this.prisma.post.findUnique({ where: { slug: postId } });
    }
    
    if (!post) {
      throw new NotFoundException('게시글을 찾을 수 없습니다.');
    }

    const comments = await this.prisma.comment.findMany({
      where: {
        postId: post.id,
        parentId: null, // 최상위 댓글만
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            profileImageUrl: true,
          },
        },
        replies: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                profileImageUrl: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return comments;
  }

  async createComment(
    postId: string,
    userId: string,
    content: string,
    parentId?: string,
  ) {
    // postId가 UUID인지 slug인지 확인
    let post;
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(postId);
    
    if (isUUID) {
      post = await this.prisma.post.findUnique({ where: { id: postId } });
    } else {
      post = await this.prisma.post.findUnique({ where: { slug: postId } });
    }
    
    if (!post) {
      throw new NotFoundException('게시글을 찾을 수 없습니다.');
    }

    const comment = await this.prisma.comment.create({
      data: {
        postId: post.id,
        userId,
        content,
        parentId: parentId || null,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            profileImageUrl: true,
          },
        },
      },
    });

    // 댓글 수 증가
    await this.prisma.post.update({
      where: { id: post.id },
      data: { commentCount: { increment: 1 } },
    });

    return comment;
  }

  async deleteComment(commentId: string, userId: string) {
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      throw new NotFoundException('댓글을 찾을 수 없습니다.');
    }

    if (comment.userId !== userId) {
      throw new ForbiddenException('삭제 권한이 없습니다.');
    }

    await this.prisma.comment.delete({
      where: { id: commentId },
    });

    // 댓글 수 감소
    await this.prisma.post.update({
      where: { id: comment.postId },
      data: { commentCount: { decrement: 1 } },
    });
  }

  async likeComment(commentId: string, userId: string) {
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      throw new NotFoundException('댓글을 찾을 수 없습니다.');
    }

    // 좋아요 수 증가 (간단 버전 - 중복 체크 없음)
    await this.prisma.comment.update({
      where: { id: commentId },
      data: { likeCount: { increment: 1 } },
    });

    return { liked: true, likeCount: comment.likeCount + 1 };
  }
  async getUserPosts(userId: string, query: FeedQueryDto, currentUserId?: string) {
  const { cursor, limit = 20 } = query;

  const where: any = {
    userId,
    status: 'PUBLISHED',
  };

  if (cursor) {
    where.id = { lt: cursor };
  }

  const posts = await this.prisma.post.findMany({
    where,
    take: limit + 1,
    orderBy: { publishedAt: 'desc' },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          profileImageUrl: true,
        },
      },
    },
  });

  const hasMore = posts.length > limit;
  const items = hasMore ? posts.slice(0, -1) : posts;
  const nextCursor = hasMore ? items[items.length - 1]?.id : null;

  return {
    items: items.map(post => ({
      id: post.id,
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt,
      previewImage: post.previewImage,
      tags: post.tags,
      viewCount: post.viewCount,
      likeCount: post.likeCount,
      commentCount: post.commentCount,
      publishedAt: post.publishedAt,
      author: post.user,
    })),
    nextCursor,
    hasMore,
  };
}
}