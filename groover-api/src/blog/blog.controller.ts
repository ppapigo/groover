// src/blog/blog.controller.ts
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { BlogService } from './blog.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { FeedQueryDto } from './dto/feed-query.dto';
import { ApiQuery } from '@nestjs/swagger';

@Controller('blog')
export class BlogController {
  constructor(private readonly blogService: BlogService) {}

  // ========================================
  // 글 작성/수정/삭제
  // ========================================

  /**
   * 글 작성
   * POST /v1/blog/posts
   */
  @Post('posts')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async createPost(@Request() req, @Body() createPostDto: CreatePostDto) {
    const post = await this.blogService.createPost(req.user.id, createPostDto);
    return {
      success: true,
      message: '글이 작성되었습니다.',
      data: post,
    };
  }

  /**
   * 글 수정
   * PUT /v1/blog/posts/:id
   */
  @Put('posts/:id')
  @UseGuards(JwtAuthGuard)
  async updatePost(
    @Request() req,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updatePostDto: UpdatePostDto,
  ) {
    const post = await this.blogService.updatePost(id, req.user.id, updatePostDto);
    return {
      success: true,
      message: '글이 수정되었습니다.',
      data: post,
    };
  }

  /**
   * 글 삭제
   * DELETE /v1/blog/posts/:id
   */
  @Delete('posts/:id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deletePost(
    @Request() req,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.blogService.deletePost(id, req.user.id);
  }

  /**
   * 글 발행/비발행
   * POST /v1/blog/posts/:id/publish
   */
  @Post('posts/:id/publish')
  @UseGuards(JwtAuthGuard)
  async publishPost(
    @Request() req,
    @Param('id', ParseUUIDPipe) id: string,
    @Body('publish') publish: boolean = true,
  ) {
    const post = await this.blogService.publishPost(id, req.user.id, publish);
    return {
      success: true,
      message: publish ? '글이 발행되었습니다.' : '글이 비공개 처리되었습니다.',
      data: post,
    };
  }

  // ========================================
  // 피드 (Feed)
  // ========================================

  /**
   * 메인 피드
   * GET /v1/blog/feed
   */
  @Get('feed')
  @UseGuards(OptionalJwtAuthGuard)
  async getFeed(@Request() req, @Query() query: FeedQueryDto) {
    const result = await this.blogService.getFeed(query, req.user?.id);
    return {
      success: true,
      data: result,
    };
  }

  /**
   * 인기 글 피드
   * GET /v1/blog/feed/popular
   */
  @Get('feed/popular')
  @UseGuards(OptionalJwtAuthGuard)
  async getPopularFeed(@Request() req, @Query() query: FeedQueryDto) {
    const result = await this.blogService.getPopularFeed(query, req.user?.id);
    return {
      success: true,
      data: result,
    };
  }

  /**
   * 태그별 피드
   * GET /v1/blog/feed/tag/:tag
   */
  @Get('feed/tag/:tag')
  @UseGuards(OptionalJwtAuthGuard)
  async getTagFeed(
    @Request() req,
    @Param('tag') tag: string,
    @Query() query: FeedQueryDto,
  ) {
    const result = await this.blogService.getTagFeed(tag, query, req.user?.id);
    return {
      success: true,
      data: result,
    };
  }

  /**
 * 추천 피드 (개인화 알고리즘)
 * GET /v1/blog/feed/recommended
 */
@Get('feed/recommended')
@UseGuards(OptionalJwtAuthGuard)
async getRecommendedFeed(@Request() req, @Query() query: FeedQueryDto) {
  const result = await this.blogService.getRecommendedFeed(query, req.user?.id);
  return {
    success: true,
    data: result,
  };
}

/**
 * 최신 글 피드 (특정 글 이후)
 * GET /v1/blog/feed/new
 */
@Get('feed/new')
@UseGuards(OptionalJwtAuthGuard)
async getNewFeed(
  @Request() req,
  @Query('after') after?: string,
  @Query('limit') limit: number = 20,
) {
  const result = await this.blogService.getNewFeed(after || null, limit, req.user?.id);
  return {
    success: true,
    data: result,
  };
}
  // ========================================
  // 글 상세
  // ========================================

  /**
   * 글 상세 조회
   * GET /v1/blog/posts/:slug
   */
  /**
 * 글 상세 조회
 * GET /v1/blog/posts/:slug
 */
@Get('posts/:slug')
@UseGuards(OptionalJwtAuthGuard)
async getPost(
  @Request() req,
  @Param('slug') slug: string,
) {
  const post = await this.blogService.getPostBySlug(slug, req.user?.id);
  
  // 로그인 유저면 열람 기록 저장
  if (req.user?.id) {
    this.blogService.recordPostView(post.id, req.user.id);
  }
  
  return {
    success: true,
    data: post,
  };
}

  /**
   * 연관 글 조회
   * GET /v1/blog/posts/:id/related
   */
  @Get('posts/:id/related')
  @UseGuards(OptionalJwtAuthGuard)
  async getRelatedPosts(
    @Request() req,
    @Param('id', ParseUUIDPipe) id: string,
    @Query('limit') limit: number = 5,
  ) {
    const posts = await this.blogService.getRelatedPosts(id, limit, req.user?.id);
    return {
      success: true,
      data: posts,
    };
  }

  // ========================================
  // 상품 정보 (Lazy Load)
  // ========================================

  /**
   * 글의 상품 카드 정보 조회 (클라이언트에서 Lazy Load)
   * GET /v1/blog/posts/:id/products
   */
  @Get('posts/:id/products')
  async getPostProducts(@Param('id', ParseUUIDPipe) id: string) {
    const products = await this.blogService.getPostProducts(id);
    return {
      success: true,
      data: products,
    };
  }

  // ========================================
  // 좋아요
  // ========================================

  /**
   * 좋아요 토글
   * POST /v1/blog/posts/:id/like
   */
  @Post('posts/:id/like')
  @UseGuards(JwtAuthGuard)
  async toggleLike(
    @Request() req,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const result = await this.blogService.toggleLike(id, req.user.id);
    return {
      success: true,
      data: result,
    };
  }

  // ========================================
  // 내 글 관리
  // ========================================

  /**
   * 내 글 목록
   * GET /v1/blog/my-posts
   */
  @Get('my-posts')
  @UseGuards(JwtAuthGuard)
  async getMyPosts(
    @Request() req,
    @Query() query: FeedQueryDto,
  ) {
    const result = await this.blogService.getMyPosts(req.user.id, query);
    return {
      success: true,
      data: result,
    };
  }

  /**
   * 내 임시저장 글
   * GET /v1/blog/my-drafts
   */
  @Get('my-drafts')
  @UseGuards(JwtAuthGuard)
  async getMyDrafts(@Request() req) {
    const drafts = await this.blogService.getMyDrafts(req.user.id);
    return {
      success: true,
      data: drafts,
    };
  }

  @Post('posts/:id/share')
  @UseGuards(OptionalJwtAuthGuard)
  async sharePost(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('platform') platform?: string,
    @Request() req?: any,
  ) {
    const result = await this.blogService.sharePost(id, req?.user?.id, platform);
    return {
      success: true,
      data: result,
    };
  }

  /**
   * 게시글 통계
   * GET /v1/blog/posts/:id/stats
   */
  @Get('posts/:id/stats')
  async getPostStats(@Param('id', ParseUUIDPipe) id: string) {
    const stats = await this.blogService.getPostStats(id);
    return {
      success: true,
      data: stats,
    };
  }
}
