// src/search/dto/search.dto.ts

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export enum SearchType {
  ALL = 'all',
  USERS = 'users',
  DEALS = 'deals',
  POSTS = 'posts',
}

export class SearchQueryDto {
  @ApiProperty({ description: '검색어', example: '뷰티' })
  @IsString()
  q: string;

  @ApiPropertyOptional({ description: '검색 타입', enum: SearchType, default: SearchType.ALL })
  @IsOptional()
  @IsEnum(SearchType)
  type?: SearchType = SearchType.ALL;

  @ApiPropertyOptional({ description: '페이지', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: '페이지당 결과 수', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 20;

  @ApiPropertyOptional({ description: '카테고리 필터' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ description: '정렬', enum: ['relevant', 'recent', 'popular'] })
  @IsOptional()
  @IsString()
  sort?: 'relevant' | 'recent' | 'popular' = 'relevant';
}

export class AutocompleteDto {
  @ApiProperty({ description: '검색어', example: '뷰' })
  @IsString()
  q: string;

  @ApiPropertyOptional({ description: '최대 결과 수', default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  limit?: number = 10;
}

// 응답 DTO
export class UserSearchResultDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string | null;

  @ApiProperty()
  email: string;

  @ApiPropertyOptional()
  profileImageUrl?: string;

  @ApiPropertyOptional()
  bio?: string;

  @ApiProperty()
  completedDeals: number;
}

export class DealSearchResultDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  description: string;

  @ApiProperty()
  totalAmount: number;

  @ApiProperty()
  status: string;

  @ApiProperty()
  advertiser: { id: string; name: string | null };

  @ApiProperty()
  createdAt: Date;
}

export class PostSearchResultDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  excerpt: string;

  @ApiPropertyOptional()
  thumbnailUrl?: string;

  @ApiProperty()
  author: { id: string; name: string | null };

  @ApiProperty()
  views: number;

  @ApiProperty()
  createdAt: Date;
}

export class SearchResultDto {
  @ApiProperty({ type: [UserSearchResultDto] })
  users: UserSearchResultDto[];

  @ApiProperty({ type: [DealSearchResultDto] })
  deals: DealSearchResultDto[];

  @ApiProperty({ type: [PostSearchResultDto] })
  posts: PostSearchResultDto[];

  @ApiProperty()
  total: {
    users: number;
    deals: number;
    posts: number;
  };

  @ApiProperty()
  page: number;

  @ApiProperty()
  totalPages: number;

  @ApiProperty()
  query: string;
}

export class AutocompleteResultDto {
  @ApiProperty()
  suggestions: string[];

  @ApiProperty()
  recentSearches: string[];

  @ApiProperty()
  popularSearches: string[];
}
