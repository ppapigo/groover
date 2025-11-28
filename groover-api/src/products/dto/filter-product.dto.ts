// src/products/dto/filter-product.dto.ts
import {
  IsOptional,
  IsString,
  IsNumber,
  IsBoolean,
  IsIn,
  Min,
  Max,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class FilterProductDto {
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 20;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  subcategory?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  minPrice?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  maxPrice?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(5)
  @Type(() => Number)
  minRating?: number;

  @IsOptional()
  @IsString()
  @IsIn(['coupang', 'naver', 'elevenst', 'gmarket', 'manual'])
  source?: string;

  @IsOptional()
  @IsString()
  brand?: string;

  @IsOptional()
  @IsString()
  @IsIn(['price', 'rating', 'reviewCount', 'popularityScore', 'createdAt', 'name'])
  sortBy?: string = 'createdAt';

  @IsOptional()
  @IsString()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  isActive?: boolean = true;
}
