// src/search/search.controller.ts

import {
  Controller,
  Get,
  Delete,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { SearchService } from './search.service';
import {
  SearchQueryDto,
  AutocompleteDto,
  SearchResultDto,
  AutocompleteResultDto,
} from './dto/search.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalAuthGuard } from '../auth/guards/optional-auth.guard';

@ApiTags('Search (검색)')
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  // ============================================
  // 통합 검색
  // ============================================
  @Get()
  @UseGuards(OptionalAuthGuard)
  @ApiOperation({
    summary: '통합 검색',
    description: '유저, 거래, 포스트를 검색합니다.',
  })
  @ApiResponse({ status: 200, type: SearchResultDto })
  async search(
    @Query() dto: SearchQueryDto,
    @Request() req: any,
  ): Promise<SearchResultDto> {
    const userId = req.user?.id;
    return this.searchService.search(dto, userId);
  }

  // ============================================
  // 자동완성
  // ============================================
  @Get('autocomplete')
  @UseGuards(OptionalAuthGuard)
  @ApiOperation({
    summary: '자동완성',
    description: '검색어 자동완성 및 추천',
  })
  @ApiResponse({ status: 200, type: AutocompleteResultDto })
  async autocomplete(
    @Query() dto: AutocompleteDto,
    @Request() req: any,
  ): Promise<AutocompleteResultDto> {
    const userId = req.user?.id;
    return this.searchService.autocomplete(dto, userId);
  }

  // ============================================
  // 최근 검색어
  // ============================================
  @Get('history')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '최근 검색어 조회' })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  async getSearchHistory(
    @Request() req: any,
    @Query('limit') limit?: string,
  ): Promise<{ recentSearches: string[] }> {
    const limitNum = limit ? parseInt(limit, 10) : 10;
    const recentSearches = await this.searchService.getRecentSearches(
      req.user.id,
      limitNum,
    );
    return { recentSearches };
  }

  // ============================================
  // 검색 히스토리 삭제
  // ============================================
  @Delete('history')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '검색 히스토리 삭제' })
  @ApiQuery({ name: 'query', required: false, description: '특정 검색어만 삭제 (없으면 전체 삭제)' })
  async deleteSearchHistory(
    @Request() req: any,
    @Query('query') query?: string,
  ): Promise<{ success: boolean }> {
    await this.searchService.deleteSearchHistory(req.user.id, query);
    return { success: true };
  }

  // ============================================
  // 인기 검색어
  // ============================================
  @Get('popular')
  @ApiOperation({ summary: '인기 검색어' })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  async getPopularSearches(
    @Query('limit') limit?: string,
  ): Promise<{ popularSearches: string[] }> {
    const limitNum = limit ? parseInt(limit, 10) : 10;
    const popularSearches = await this.searchService.getPopularSearches(limitNum);
    return { popularSearches };
  }
}
