// src/dm/services/dm-search.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SearchMessagesDto } from '../dto';

@Injectable()
export class DmSearchService {
  private readonly logger = new Logger(DmSearchService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 메시지 검색
   * - 내가 참여한 스레드의 메시지만 검색
   * - 키워드 기반 검색
   */
  async searchMessages(userId: string, dto: SearchMessagesDto) {
    const { query, threadId, limit = 20 } = dto;

    // 내가 참여한 스레드 ID 목록
    let threadIds: string[] = [];

    if (threadId) {
      // 특정 스레드에서만 검색
      const thread = await this.prisma.dmThread.findFirst({
        where: {
          id: threadId,
          OR: [
            { user1Id: userId },
            { user2Id: userId },
          ],
        },
      });
      if (thread) {
        threadIds = [thread.id];
      }
    } else {
      // 모든 스레드에서 검색
      const threads = await this.prisma.dmThread.findMany({
        where: {
          OR: [
            { user1Id: userId },
            { user2Id: userId },
          ],
        },
        select: { id: true },
      });
      threadIds = threads.map(t => t.id);
    }

    if (threadIds.length === 0) {
      return { items: [], total: 0 };
    }

    // 메시지 검색 (PostgreSQL full-text search 또는 LIKE)
    const messages = await this.prisma.dmMessage.findMany({
      where: {
        threadId: { in: threadIds },
        content: {
          contains: query,
          mode: 'insensitive', // 대소문자 무시
        },
      },
      include: {
        sender: { select: { id: true, name: true, profileImageUrl: true } },
        thread: {
          include: {
            user1: { select: { id: true, name: true } },
            user2: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    // 결과 포맷팅
    const items = messages.map(msg => ({
      id: msg.id,
      threadId: msg.threadId,
      content: msg.content,
      sender: msg.sender,
      partner: msg.thread.user1Id === userId ? msg.thread.user2 : msg.thread.user1,
      createdAt: msg.createdAt,
      // 검색어 하이라이트 정보
      highlight: this.getHighlight(msg.content, query),
    }));

    return {
      items,
      total: items.length,
      query,
    };
  }

  /**
   * 검색어 하이라이트 정보
   */
  private getHighlight(content: string, query: string): {
    start: number;
    end: number;
    text: string;
  } | null {
    const lowerContent = content.toLowerCase();
    const lowerQuery = query.toLowerCase();
    const index = lowerContent.indexOf(lowerQuery);

    if (index === -1) return null;

    // 검색어 주변 컨텍스트 (앞뒤 30자)
    const contextStart = Math.max(0, index - 30);
    const contextEnd = Math.min(content.length, index + query.length + 30);
    
    return {
      start: index - contextStart,
      end: index - contextStart + query.length,
      text: (contextStart > 0 ? '...' : '') + 
            content.slice(contextStart, contextEnd) + 
            (contextEnd < content.length ? '...' : ''),
    };
  }

  /**
   * 스레드 내 검색 (간단 버전)
   */
  async searchInThread(
    userId: string,
    threadId: string,
    query: string,
    limit: number = 50,
  ) {
    return this.searchMessages(userId, { query, threadId, limit });
  }
}
