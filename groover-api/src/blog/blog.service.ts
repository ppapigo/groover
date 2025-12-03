// src/blog/blog.service.ts
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProductLinkParserService } from './services/product-link-parser.service';
import { DisclaimerService } from './services/disclaimer.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { FeedQueryDto } from './dto/feed-query.dto';

@Injectable()
export class BlogService {
  private readonly logger = new Logger(BlogService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly linkParser: ProductLinkParserService,
    private readonly disclaimerService: DisclaimerService,
  ) {}

  // ========================================
  // 글 작성/수정/삭제
  // ========================================

  /**
   * 글 작성
   */
  async createPost(userId: string, dto: CreatePostDto) {
    // 1. 본문에서 상품 링크 추출
    const extractedProducts = await this.linkParser.extractProducts(dto.content);
    
    // 2. 협찬 문구 필요 여부 확인
    const hasAffiliateLinks = extractedProducts.length > 0;
    
    // 3. 협찬 문구 자동 삽입 (필요시)
    let processedContent = dto.content;
    if (hasAffiliateLinks) {
      const sources = [...new Set(extractedProducts.map(p => p.source))];
      processedContent = this.disclaimerService.appendDisclaimer(dto.content, sources);
    }
    
    // 4. Slug 생성
    const slug = await this.generateSlug(dto.title);
    
    // 5. 대표 이미지 추출 (첫 번째 이미지)
    const previewImage = dto.previewImage || this.extractFirstImage(dto.content);
    
    // 6. 요약 생성
    const excerpt = dto.excerpt || this.generateExcerpt(dto.content);

    // 7. 글 생성
    const post = await this.prisma.post.create({
      data: {
        userId,
        title: dto.title,
        content: processedContent,
        previewImage,
        tags: dto.tags || [],
        slug,
        excerpt,
        status: dto.publish ? 'PUBLISHED' : 'DRAFT',
        publishedAt: dto.publish ? new Date() : null,
        hasAffiliateLinks,
        products: {
          create: extractedProducts.map((product, index) => ({
            productId: product.productId,
            source: product.source,
            name: product.name,
            image: product.image,
            price: product.price,
            originalUrl: product.originalUrl,
            affiliateUrl: product.affiliateUrl,
            position: index,
          })),
        },
      },
      include: {
        user: {
          select: { id: true, name: true },
        },
        products: true,
      },
    });

    this.logger.log(`Post created: ${post.id} by user ${userId}`);
    return this.formatPost(post);
  }

  /**
   * 글 수정
   */
  async updatePost(postId: string, userId: string, dto: UpdatePostDto) {
    // 글 확인
    const existingPost = await this.prisma.post.findUnique({
      where: { id: postId },
      include: { products: true },
    });

    if (!existingPost) {
      throw new NotFoundException('글을 찾을 수 없습니다.');
    }

    if (existingPost.userId !== userId) {
      throw new ForbiddenException('본인의 글만 수정할 수 있습니다.');
    }

    // 본문이 변경된 경우 상품 링크 재추출
    let updateData: any = { ...dto };
    
    if (dto.content) {
      const extractedProducts = await this.linkParser.extractProducts(dto.content);
      const hasAffiliateLinks = extractedProducts.length > 0;
      
      // 협찬 문구 처리
      let processedContent = dto.content;
      if (hasAffiliateLinks) {
        const sources = [...new Set(extractedProducts.map(p => p.source))];
        processedContent = this.disclaimerService.appendDisclaimer(dto.content, sources);
      }
      
      updateData.content = processedContent;
      updateData.hasAffiliateLinks = hasAffiliateLinks;
      
      // 기존 상품 삭제 후 새로 추가
      await this.prisma.postProduct.deleteMany({ where: { postId } });
      
      if (extractedProducts.length > 0) {
        await this.prisma.postProduct.createMany({
          data: extractedProducts.map((product, index) => ({
            postId,
            productId: product.productId,
            source: product.source,
            name: product.name,
            image: product.image,
            price: product.price,
            originalUrl: product.originalUrl,
            affiliateUrl: product.affiliateUrl,
            position: index,
          })),
        });
      }
    }

    // 제목 변경 시 slug 업데이트
    if (dto.title && dto.title !== existingPost.title) {
      updateData.slug = await this.generateSlug(dto.title, postId);
    }

    const post = await this.prisma.post.update({
      where: { id: postId },
      data: updateData,
      include: {
        user: { select: { id: true, name: true } },
        products: true,
      },
    });

    return this.formatPost(post);
  }

  /**
   * 글 삭제
   */
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

  /**
   * 글 발행/비발행
   */
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

  /**
   * 메인 피드 (최신순)
   */
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

  /**
   * 인기 글 피드 (조회수 + 좋아요 기준)
   */
  async getPopularFeed(query: FeedQueryDto, userId?: string) {
    const { limit = 20 } = query;
    
    // 최근 7일 인기 글
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

  /**
   * 태그별 피드
   */
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

  /**
   * 슬러그로 글 조회
   */
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

    // 비공개 글은 작성자만 볼 수 있음
    if (post.status !== 'PUBLISHED' && post.userId !== userId) {
      throw new NotFoundException('글을 찾을 수 없습니다.');
    }

    // 조회수 증가 (비동기)
    this.prisma.post.update({
      where: { id: post.id },
      data: { viewCount: { increment: 1 } },
    }).catch(() => {});

    return this.formatPostDetail(post, userId);
  }

  /**
   * 연관 글 조회
   */
  async getRelatedPosts(postId: string, limit: number = 5, userId?: string) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      select: { tags: true, userId: true },
    });

    if (!post) {
      throw new NotFoundException('글을 찾을 수 없습니다.');
    }

    // 1순위: 같은 태그
    // 2순위: 같은 작성자
    // 3순위: 최신 글
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
      orderBy: [
        { publishedAt: 'desc' },
      ],
      include: {
        user: { select: { id: true, name: true } },
        _count: { select: { likes: true } },
      },
    });

    // 부족하면 최신 글로 채우기
    if (relatedPosts.length < limit) {
      const moreNeeded = limit - relatedPosts.length;
      const existingIds = [postId, ...relatedPosts.map(p => p.id)];
      
      const morePosts = await this.prisma.post.findMany({
        where: {
          id: { notIn: existingIds },
          status: 'PUBLISHED',
        },
        take: moreNeeded,
        orderBy: { publishedAt: 'desc' },
        include: {
          user: { select: { id: true, name: true } },
          _count: { select: { likes: true } },
        },
      });

      relatedPosts.push(...morePosts);
    }

    return relatedPosts.map(p => this.formatFeedItem(p, userId));
  }

  /**
   * 글의 상품 정보 조회 (Lazy Load용 - 서버 프록시)
   */
  async getPostProducts(postId: string) {
    const products = await this.prisma.postProduct.findMany({
      where: { postId },
      orderBy: { position: 'asc' },
    });

    // 상품 정보는 서버를 통해 전달 (데이터 마이닝 방지)
    return products.map(product => ({
      id: product.id,
      name: product.name,
      image: product.image,
      price: product.price,
      source: product.source,
      // affiliateUrl은 클릭 시 서버에서 리다이렉트 처리
      clickUrl: `/v1/blog/products/${product.id}/click`,
    }));
  }

  // ========================================
  // 좋아요
  // ========================================

  async toggleLike(postId: string, userId: string) {
    const existingLike = await this.prisma.postLike.findUnique({
      where: {
        postId_userId: { postId, userId },
      },
    });

    if (existingLike) {
      // 좋아요 취소
      await this.prisma.$transaction([
        this.prisma.postLike.delete({
          where: { id: existingLike.id },
        }),
        this.prisma.post.update({
          where: { id: postId },
          data: { likeCount: { decrement: 1 } },
        }),
      ]);
      return { liked: false };
    } else {
      // 좋아요 추가
      await this.prisma.$transaction([
        this.prisma.postLike.create({
          data: { postId, userId },
        }),
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
      include: {
        _count: { select: { likes: true } },
      },
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
    const drafts = await this.prisma.post.findMany({
      where: {
        userId,
        status: 'DRAFT',
      },
      orderBy: { updatedAt: 'desc' },
    });

    return drafts;
  }

  // ========================================
  // 헬퍼 메서드
  // ========================================

  /**
   * Slug 생성
   */
  private async generateSlug(title: string, excludeId?: string): Promise<string> {
    // 한글/영문/숫자만 추출, 공백은 하이픈으로
    let slug = title
      .toLowerCase()
      .replace(/[^a-z0-9가-힣\s]/g, '')
      .replace(/\s+/g, '-')
      .slice(0, 50);
    
    // 랜덤 suffix 추가
    slug = `${slug}-${this.generateRandomString(6)}`;

    // 중복 확인
    const existing = await this.prisma.post.findUnique({
      where: { slug },
    });

    if (existing && existing.id !== excludeId) {
      return this.generateSlug(title, excludeId);
    }

    return slug;
  }

  /**
   * 랜덤 문자열 생성
   */
  private generateRandomString(length: number): string {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    return Array.from({ length }, () => 
      chars[Math.floor(Math.random() * chars.length)]
    ).join('');
  }

  /**
   * 첫 번째 이미지 추출
   */
  private extractFirstImage(content: string): string | null {
    const imgMatch = content.match(/<img[^>]+src=["']([^"']+)["']/i);
    if (imgMatch) return imgMatch[1];
    
    const mdMatch = content.match(/!\[.*?\]\(([^)]+)\)/);
    if (mdMatch) return mdMatch[1];
    
    return null;
  }

  /**
   * 요약 생성
   */
  private generateExcerpt(content: string, maxLength: number = 150): string {
    // HTML 태그 제거
    const text = content.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
    
    if (text.length <= maxLength) return text;
    
    return text.slice(0, maxLength).trim() + '...';
  }

  /**
   * 글 포맷팅 (상세)
   */
  private formatPost(post: any) {
    return {
      id: post.id,
      title: post.title,
      content: post.content,
      previewImage: post.previewImage,
      tags: post.tags,
      slug: post.slug,
      excerpt: post.excerpt,
      status: post.status,
      hasAffiliateLinks: post.hasAffiliateLinks,
      viewCount: post.viewCount,
      likeCount: post.likeCount,
      author: post.user,
      products: post.products?.map((p: any) => ({
        id: p.id,
        name: p.name,
        image: p.image,
        price: p.price,
        source: p.source,
      })),
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
      publishedAt: post.publishedAt,
    };
  }

  /**
   * 글 상세 포맷팅
   */
  private formatPostDetail(post: any, userId?: string) {
    const isLiked = post.likes?.length > 0;
    
    return {
      id: post.id,
      title: post.title,
      content: post.content,
      previewImage: post.previewImage,
      tags: post.tags,
      slug: post.slug,
      status: post.status,
      hasAffiliateLinks: post.hasAffiliateLinks,
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

  /**
   * 피드 아이템 포맷팅 (간략)
   */
  private formatFeedItem(post: any, userId?: string) {
    return {
      id: post.id,
      title: post.title,
      previewImage: post.previewImage,
      excerpt: post.excerpt,
      slug: post.slug,
      tags: post.tags,
      status: post.status,
      viewCount: post.viewCount,
      likeCount: post._count?.likes || post.likeCount,
      author: post.user,
      publishedAt: post.publishedAt,
    };
  }
}
