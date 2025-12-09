// src/search/search.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  SearchQueryDto,
  SearchType,
  AutocompleteDto,
  SearchResultDto,
  AutocompleteResultDto,
  UserSearchResultDto,
  DealSearchResultDto,
} from './dto/search.dto';

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ============================================
  // 통합 검색
  // ============================================
  async search(dto: SearchQueryDto, userId?: string): Promise<SearchResultDto> {
    const { q, type, page = 1, limit = 20, sort } = dto;
    const skip = (page - 1) * limit;
    const query = q.trim();

    if (!query) {
      return this.emptyResult(query, page);
    }

    // 검색 히스토리 저장 (로그인 유저만)
    if (userId) {
      this.saveSearchHistory(userId, query, type).catch((err) =>
        this.logger.error('검색 히스토리 저장 실패', err),
      );
    }

    // 인기 검색어 업데이트
    this.updatePopularSearch(query).catch((err) =>
      this.logger.error('인기 검색어 업데이트 실패', err),
    );

    const results: SearchResultDto = {
      users: [],
      deals: [],
      posts: [],
      total: { users: 0, deals: 0, posts: 0 },
      page,
      totalPages: 1,
      query,
    };

    // 타입별 검색 실행
    const searchPromises: Promise<void>[] = [];

    if (type === SearchType.ALL || type === SearchType.USERS) {
      searchPromises.push(
        this.searchUsers(query, skip, limit, sort).then((r) => {
          results.users = r.items;
          results.total.users = r.total;
        }),
      );
    }

    if (type === SearchType.ALL || type === SearchType.DEALS) {
      searchPromises.push(
        this.searchDeals(query, skip, limit, sort).then((r) => {
          results.deals = r.items;
          results.total.deals = r.total;
        }),
      );
    }

    // Posts 검색 (Post 모델이 있다면)
     if (type === SearchType.ALL || type === SearchType.POSTS) {
       searchPromises.push(
         this.searchPosts(query, skip, limit, sort).then((r) => {
           results.posts = r.items;
           results.total.posts = r.total;
         }),
       );
     }

    await Promise.all(searchPromises);

    // 전체 페이지 수 계산
    const totalItems = results.total.users + results.total.deals + results.total.posts;
    results.totalPages = Math.ceil(totalItems / limit) || 1;

    return results;
  }

  // ============================================
  // 유저 검색
  // ============================================
  private async searchUsers(
    query: string,
    skip: number,
    limit: number,
    sort?: string,
  ): Promise<{ items: UserSearchResultDto[]; total: number }> {
    const searchPattern = `%${query}%`;

    // 정렬 조건
    let orderBy: any = { createdAt: 'desc' };
    if (sort === 'popular') {
      orderBy = { creatorDeals: { _count: 'desc' } };
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where: {
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { email: { contains: query, mode: 'insensitive' } },
          ],
          // 정지되지 않은 유저만
          adMatchingSuspended: false,
        },
        select: {
          id: true,
          name: true,
          email: true,
          profileImageUrl: true,
          _count: {
            select: {
              creatorDeals: { where: { status: 'SETTLED' } },
            },
          },
        },
        skip,
        take: limit,
        orderBy,
      }),
      this.prisma.user.count({
        where: {
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { email: { contains: query, mode: 'insensitive' } },
          ],
          adMatchingSuspended: false,
        },
      }),
    ]);

    return {
      items: users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        profileImageUrl: u.profileImageUrl || undefined,
        completedDeals: u._count.creatorDeals,
      })),
      total,
    };
  }

  // ============================================
  // 거래 검색
  // ============================================
  private async searchDeals(
    query: string,
    skip: number,
    limit: number,
    sort?: string,
  ): Promise<{ items: DealSearchResultDto[]; total: number }> {
    // 정렬 조건
    let orderBy: any = { createdAt: 'desc' };
    if (sort === 'popular') {
      orderBy = { totalAmount: 'desc' };
    }

    const [deals, total] = await Promise.all([
      this.prisma.adDeal.findMany({
        where: {
          OR: [
            { title: { contains: query, mode: 'insensitive' } },
            { description: { contains: query, mode: 'insensitive' } },
          ],
          // 공개된 거래만 (PROPOSED 상태)
          status: 'PROPOSED',
        },
        select: {
          id: true,
          title: true,
          description: true,
          totalAmount: true,
          status: true,
          createdAt: true,
          advertiser: {
            select: { id: true, name: true },
          },
        },
        skip,
        take: limit,
        orderBy,
      }),
      this.prisma.adDeal.count({
        where: {
          OR: [
            { title: { contains: query, mode: 'insensitive' } },
            { description: { contains: query, mode: 'insensitive' } },
          ],
          status: 'PROPOSED',
        },
      }),
    ]);

    return {
      items: deals.map((d) => ({
        id: d.id,
        title: d.title,
        description: d.description,
        totalAmount: d.totalAmount,
        status: d.status,
        advertiser: d.advertiser,
        createdAt: d.createdAt,
      })),
      total,
    };
  }
  // ============================================
  // Posts 검색
  // ============================================
  private async searchPosts(
  query: string,
  skip: number,
  limit: number,
  sort?: string,
): Promise<{ items: any[]; total: number }> {
  let orderBy: any = { createdAt: 'desc' };
  if (sort === 'popular') {
    orderBy = { viewCount: 'desc' };
  }

  // # 으로 시작하면 태그 전용 검색
  const isTagSearch = query.startsWith('#');
  const searchTerm = isTagSearch ? query.slice(1) : query;

  const whereCondition = isTagSearch
    ? {
        tags: { has: searchTerm },
        status: 'PUBLISHED',
      }
    : {
        OR: [
          { title: { contains: searchTerm, mode: 'insensitive' } },
          { content: { contains: searchTerm, mode: 'insensitive' } },
          { tags: { has: searchTerm } },
        ],
        status: 'PUBLISHED',
      };

  const [posts, total] = await Promise.all([
    this.prisma.post.findMany({
      where: whereCondition as any,
      select: {
        id: true,
        title: true,
        excerpt: true,
        previewImage: true,
        slug: true,
        viewCount: true,
        likeCount: true,
        user: {
          select: { id: true, name: true },
        },
      },
      skip,
      take: limit,
      orderBy,
    }),
    this.prisma.post.count({
      where: whereCondition as any,
    }),
  ]);

  return {
    items: posts.map((p) => ({
      id: p.id,
      title: p.title,
      excerpt: p.excerpt,
      previewImage: p.previewImage,
      slug: p.slug,
      viewCount: p.viewCount,
      likeCount: p.likeCount,
      author: p.user,
    })),
    total,
  };
}
  // ============================================
  // 자동완성
  // ============================================
  async autocomplete(dto: AutocompleteDto, userId?: string): Promise<AutocompleteResultDto> {
    const { q, limit = 10 } = dto;
    const query = q.trim();

    const result: AutocompleteResultDto = {
      suggestions: [],
      recentSearches: [],
      popularSearches: [],
    };

    if (query.length < 1) {
      // 빈 쿼리면 인기 검색어만 반환
      result.popularSearches = await this.getPopularSearches(limit);
      if (userId) {
        result.recentSearches = await this.getRecentSearches(userId, 5);
      }
      return result;
    }

    // 제안어 생성 (유저 이름, 거래 제목에서)
    const [userSuggestions, dealSuggestions, popularSearches, recentSearches] = await Promise.all([
      // 유저 이름 제안
      this.prisma.user.findMany({
        where: {
          name: { contains: query, mode: 'insensitive' },
          adMatchingSuspended: false,
        },
        select: { name: true },
        take: 5,
      }),
      // 거래 제목 제안
      this.prisma.adDeal.findMany({
        where: {
          title: { contains: query, mode: 'insensitive' },
          status: 'PROPOSED',
        },
        select: { title: true },
        take: 5,
      }),
      // 인기 검색어
      this.getPopularSearches(5, query),
      // 최근 검색어
      userId ? this.getRecentSearches(userId, 5) : Promise.resolve([]),
    ]);

    // 중복 제거하며 합치기
    const suggestionSet = new Set<string>();
    
    userSuggestions.forEach((u) => u.name && suggestionSet.add(u.name));
    dealSuggestions.forEach((d) => suggestionSet.add(d.title));
    
    result.suggestions = Array.from(suggestionSet).slice(0, limit);
    result.popularSearches = popularSearches;
    result.recentSearches = recentSearches;

    return result;
  }

  // ============================================
  // 검색 히스토리
  // ============================================
  private async saveSearchHistory(userId: string, query: string, type?: SearchType): Promise<void> {
    // 동일 검색어 중복 방지 (최근 1시간 내)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    const existing = await this.prisma.searchHistory.findFirst({
      where: {
        userId,
        query,
        createdAt: { gte: oneHourAgo },
      },
    });

    if (!existing) {
      await this.prisma.searchHistory.create({
        data: {
          userId,
          query,
          type: type || 'all',
        },
      });

      // 오래된 히스토리 정리 (최근 100개만 유지)
      const histories = await this.prisma.searchHistory.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip: 100,
        select: { id: true },
      });

      if (histories.length > 0) {
        await this.prisma.searchHistory.deleteMany({
          where: { id: { in: histories.map((h) => h.id) } },
        });
      }
    }
  }

  async getRecentSearches(userId: string, limit: number = 10): Promise<string[]> {
    const histories = await this.prisma.searchHistory.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      distinct: ['query'],
      take: limit,
      select: { query: true },
    });

    return histories.map((h) => h.query);
  }

  async deleteSearchHistory(userId: string, query?: string): Promise<void> {
    if (query) {
      await this.prisma.searchHistory.deleteMany({
        where: { userId, query },
      });
    } else {
      await this.prisma.searchHistory.deleteMany({
        where: { userId },
      });
    }
  }

  // ============================================
  // 인기 검색어
  // ============================================
  private async updatePopularSearch(query: string): Promise<void> {
    await this.prisma.popularSearch.upsert({
      where: { query },
      update: { count: { increment: 1 } },
      create: { query, count: 1 },
    });
  }

  async getPopularSearches(limit: number = 10, prefix?: string): Promise<string[]> {
    const where = prefix
      ? { query: { startsWith: prefix, mode: 'insensitive' as const } }
      : {};

    const popular = await this.prisma.popularSearch.findMany({
      where,
      orderBy: { count: 'desc' },
      take: limit,
      select: { query: true },
    });

    return popular.map((p) => p.query);
  }

  // ============================================
  // 빈 결과
  // ============================================
  private emptyResult(query: string, page: number): SearchResultDto {
    return {
      users: [],
      deals: [],
      posts: [],
      total: { users: 0, deals: 0, posts: 0 },
      page,
      totalPages: 1,
      query,
    };
  }
}
