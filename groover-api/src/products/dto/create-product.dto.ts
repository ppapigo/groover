// src/products/dto/create-product.dto.ts
import {
  IsString,
  IsNumber,
  IsOptional,
  IsUrl,
  IsArray,
  IsBoolean,
  Min,
  Max,
  IsIn,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class CreateProductDto {
  @IsOptional()
  @IsString()
  externalId?: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  price: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  originalPrice?: number;

  @IsString()
  category: string;

  @IsOptional()
  @IsString()
  subcategory?: string;

  @IsOptional()
  @IsString()
  brand?: string;

  @IsOptional()
  @IsUrl()
  imageUrl?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(5)
  @Type(() => Number)
  rating?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  reviewCount?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  popularityScore?: number;

  @IsOptional()
  @IsString()
  @IsIn(['coupang', 'naver', 'elevenst', 'gmarket', 'manual'])
  source?: string;

  @IsOptional()
  @IsUrl()
  sourceUrl?: string;

  @IsOptional()
  metadata?: any;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  isActive?: boolean;
}
