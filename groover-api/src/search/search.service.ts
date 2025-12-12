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
} from './dto/search.dto';

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);

  constructor(private readonly prisma: PrismaService) {}

  async search(dto: SearchQueryDto, userId?: string): Promise<SearchResultDto> {
    const { q, type, page = 1, limit = 20, sort } = dto;
    const skip = (page - 1) * limit;
    const query = q.trim();

    if (!query) {
      return this.emptyResult(query, page);
    }

    if (userId) {
      this.saveSearchHistory(userId, query, type).catch((err) =>
        this.logger.error('검색 히스토리 저장 실패', err),
      );
    }

    this.updatePopularSearch(query).catch((err) =>
      this.logger.error('인기 검색어 업데이트 실패', err),
    );

    const results: SearchResultDto = {
      users: [],
      posts: [],
      total: { users: 0, posts: 0 },
      page,
      totalPages: 1,
      query,
    };

    const searchPromises: Promise<void>[] = [];

    if (type === SearchType.ALL || type === SearchType.USERS) {
      searchPromises.push(
        this.searchUsers(query, skip, limit, sort).then((r) => {
          results.users = r.items;
          results.total.users = r.total;
        }),
      );
    }

    if (type === SearchType.ALL || type === SearchType.POSTS) {
      searchPromises.push(
        this.searchPosts(query, skip, limit, sort).then((r) => {
          results.posts = r.items;
          results.total.posts = r.total;
        }),
      );
    }

    await Promise.all(searchPromises);

    const totalItems = results.total.users + results.total.posts;
    results.totalPages = Math.ceil(totalItems / limit) || 1;

    return results;
  }

  private async searchUsers(
    query: string,
    skip: number,
    limit: number,
    sort?: string,
  ): Promise<{ items: UserSearchResultDto[]; total: number }> {
    let orderBy: any = { createdAt: 'desc' };
    if (sort === 'popular') {
      orderBy = { posts: { _count: 'desc' } };
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where: {
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { email: { contains: query, mode: 'insensitive' } },
          ],
          suspendedUntil: null,
        },
        select: {
          id: true,
          name: true,
          email: true,
          profileImageUrl: true,
          _count: { select: { posts: true } },
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
          suspendedUntil: null,
        },
      }),
    ]);

    return {
      items: users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        profileImageUrl: u.profileImageUrl || undefined,
        postCount: u._count.posts,
      })),
      total,
    };
  }

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

    const isTagSearch = query.startsWith('#');
    const searchTerm = isTagSearch ? query.slice(1) : query;

    const whereCondition = isTagSearch
      ? { tags: { has: searchTerm }, status: 'PUBLISHED' }
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
          user: { select: { id: true, name: true } },
        },
        skip,
        take: limit,
        orderBy,
      }),
      this.prisma.post.count({ where: whereCondition as any }),
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

  async autocomplete(dto: AutocompleteDto, userId?: string): Promise<AutocompleteResultDto> {
    const { q, limit = 10 } = dto;
    const query = q.trim();

    const result: AutocompleteResultDto = {
      suggestions: [],
      recentSearches: [],
      popularSearches: [],
    };

    if (query.length < 1) {
      result.popularSearches = await this.getPopularSearches(limit);
      if (userId) {
        result.recentSearches = await this.getRecentSearches(userId, 5);
      }
      return result;
    }

    const [userSuggestions, postSuggestions, popularSearches, recentSearches] = await Promise.all([
      this.prisma.user.findMany({
        where: { name: { contains: query, mode: 'insensitive' }, suspendedUntil: null },
        select: { name: true },
        take: 5,
      }),
      this.prisma.post.findMany({
        where: { title: { contains: query, mode: 'insensitive' }, status: 'PUBLISHED' },
        select: { title: true },
        take: 5,
      }),
      this.getPopularSearches(5, query),
      userId ? this.getRecentSearches(userId, 5) : Promise.resolve([]),
    ]);

    const suggestionSet = new Set<string>();
    userSuggestions.forEach((u) => u.name && suggestionSet.add(u.name));
    postSuggestions.forEach((p) => suggestionSet.add(p.title));

    result.suggestions = Array.from(suggestionSet).slice(0, limit);
    result.popularSearches = popularSearches;
    result.recentSearches = recentSearches;

    return result;
  }

  private async saveSearchHistory(userId: string, query: string, type?: SearchType): Promise<void> {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    const existing = await this.prisma.searchHistory.findFirst({
      where: { userId, query, createdAt: { gte: oneHourAgo } },
    });

    if (!existing) {
      await this.prisma.searchHistory.create({
        data: { userId, query, type: type || 'all' },
      });

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
      await this.prisma.searchHistory.deleteMany({ where: { userId, query } });
    } else {
      await this.prisma.searchHistory.deleteMany({ where: { userId } });
    }
  }

  private async updatePopularSearch(query: string): Promise<void> {
    await this.prisma.popularSearch.upsert({
      where: { query },
      update: { count: { increment: 1 } },
      create: { query, count: 1 },
    });
  }

  async getPopularSearches(limit: number = 10, prefix?: string): Promise<string[]> {
    const where = prefix ? { query: { startsWith: prefix, mode: 'insensitive' as const } } : {};

    const popular = await this.prisma.popularSearch.findMany({
      where,
      orderBy: { count: 'desc' },
      take: limit,
      select: { query: true },
    });
    return popular.map((p) => p.query);
  }

  private emptyResult(query: string, page: number): SearchResultDto {
    return {
      users: [],
      posts: [],
      total: { users: 0, posts: 0 },
      page,
      totalPages: 1,
      query,
    };
  }
}