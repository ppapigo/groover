// src/search/dto/search.dto.ts

import { IsString, IsOptional, IsEnum, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export enum SearchType {
  ALL = 'all',
  USERS = 'users',
  POSTS = 'posts',
}

export class SearchQueryDto {
  @IsString()
  q: string;

  @IsOptional()
  @IsEnum(SearchType)
  type?: SearchType = SearchType.ALL;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 20;

  @IsOptional()
  @IsString()
  sort?: 'relevant' | 'recent' | 'popular' = 'relevant';
}

export class AutocompleteDto {
  @IsString()
  q: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  limit?: number = 10;
}

export class UserSearchResultDto {
  id: string;
  name: string | null;
  email: string;
  profileImageUrl?: string;
  postCount: number;
}

export class PostSearchResultDto {
  id: string;
  title: string;
  excerpt: string;
  previewImage?: string;
  slug: string;
  viewCount: number;
  likeCount: number;
  author: { id: string; name: string | null };
}

export class SearchResultDto {
  users: UserSearchResultDto[];
  posts: PostSearchResultDto[];
  total: { users: number; posts: number };
  page: number;
  totalPages: number;
  query: string;
}

export class AutocompleteResultDto {
  suggestions: string[];
  recentSearches: string[];
  popularSearches: string[];
}