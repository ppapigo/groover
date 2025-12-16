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
} from '@nestjs/common';
import { BlogService } from './blog.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { FeedQueryDto } from './dto/feed-query.dto';

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

  // ========================================
  // 글 상세
  // ========================================

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
  // src/blog/blog.controller.ts - 맨 아래에 추가

  // ========================================
  // 댓글
  // ========================================

  /**
   * 댓글 목록 조회
   * GET /v1/blog/posts/:id/comments
   */
  @Get('posts/:id/comments')
  async getComments(@Param('id') id: string) {
    const comments = await this.blogService.getComments(id);
    return {
      success: true,
      data: comments,
    };
  }

  /**
   * 댓글 작성
   * POST /v1/blog/posts/:id/comments
   */
  @Post('posts/:id/comments')
  @UseGuards(JwtAuthGuard)
  async createComment(
    @Request() req,
    @Param('id') id: string,
    @Body() body: { content: string; parentId?: string },
  ) {
    const comment = await this.blogService.createComment(
      id,
      req.user.id,
      body.content,
      body.parentId,
    );
    return {
      success: true,
      data: comment,
    };
  }

  /**
   * 댓글 삭제
   * DELETE /v1/blog/comments/:id
   */
  @Delete('comments/:id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteComment(
    @Request() req,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.blogService.deleteComment(id, req.user.id);
  }

  /**
   * 댓글 좋아요
   * POST /v1/blog/comments/:id/like
   */
  @Post('comments/:id/like')
  @UseGuards(JwtAuthGuard)
  async likeComment(
    @Request() req,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const result = await this.blogService.likeComment(id, req.user.id);
    return {
      success: true,
      data: result,
    };
  }
}