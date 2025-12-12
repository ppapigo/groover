// src/tags/tags.controller.ts
import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { TagsService } from './tags.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('tags')
export class TagsController {
  constructor(private readonly tagsService: TagsService) {}

  // ==================== FEED TAGS ====================

  // 모든 피드 태그 조회
  @Get('feed')
  async getAllFeedTags(@Query('category') category?: string) {
    const tags = await this.tagsService.getAllFeedTags(category);
    return { success: true, data: tags };
  }

  // 인기 피드 태그
  @Get('feed/popular')
  async getPopularFeedTags(@Query('limit') limit?: string) {
    const tags = await this.tagsService.getPopularFeedTags(
      limit ? parseInt(limit) : 10,
    );
    return { success: true, data: tags };
  }

  // 피드 태그 상세
  @Get('feed/:slug')
  async getFeedTagBySlug(@Param('slug') slug: string) {
    const tag = await this.tagsService.getFeedTagBySlug(slug);
    return { success: true, data: tag };
  }

  // 피드 태그의 글 목록
  @Get('feed/:slug/posts')
  async getPostsByFeedTag(
    @Param('slug') slug: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    const result = await this.tagsService.getPostsByFeedTag(
      slug,
      cursor,
      limit ? parseInt(limit) : 20,
    );
    return { success: true, data: result };
  }

  // ==================== FREE TAGS ====================

  // 자유 태그 검색 (자동완성)
  @Get('free/search')
  async searchFreeTags(
    @Query('q') query: string,
    @Query('limit') limit?: string,
  ) {
    const tags = await this.tagsService.searchFreeTags(
      query,
      limit ? parseInt(limit) : 10,
    );
    return { success: true, data: tags };
  }

  // ==================== USER PINNED TAGS ====================

  // 내가 핀한 태그 조회
  @Get('pinned')
  @UseGuards(JwtAuthGuard)
  async getMyPinnedTags(@Request() req) {
    const tags = await this.tagsService.getUserPinnedTags(req.user.id);
    return { success: true, data: tags };
  }

  // 태그 핀하기
  @Post('pinned/:feedTagId')
  @UseGuards(JwtAuthGuard)
  async pinTag(@Request() req, @Param('feedTagId') feedTagId: string) {
    const result = await this.tagsService.pinTag(req.user.id, feedTagId);
    return { success: true, data: result };
  }

  // 태그 핀 해제
  @Delete('pinned/:feedTagId')
  @UseGuards(JwtAuthGuard)
  async unpinTag(@Request() req, @Param('feedTagId') feedTagId: string) {
    await this.tagsService.unpinTag(req.user.id, feedTagId);
    return { success: true, message: '핀 해제되었습니다' };
  }

  // 핀 순서 변경
  @Post('pinned/reorder')
  @UseGuards(JwtAuthGuard)
  async reorderPinnedTags(@Request() req, @Body('tagIds') tagIds: string[]) {
    const tags = await this.tagsService.reorderPinnedTags(req.user.id, tagIds);
    return { success: true, data: tags };
  }

  // ==================== PINNED TAG FEED ====================

  // 핀한 태그 기반 맞춤 피드
  @Get('pinned/feed')
  @UseGuards(JwtAuthGuard)
  async getPinnedTagFeed(
    @Request() req,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    const result = await this.tagsService.getPinnedTagFeed(
      req.user.id,
      cursor,
      limit ? parseInt(limit) : 20,
    );
    return { success: true, data: result };
  }
}