// src/recommendations/dto/create-recommendation.dto.ts
import {
  IsNumber,
  IsArray,
  IsOptional,
  IsString,
  IsBoolean,
  IsIn,
  ValidateNested,
  Min,
  Max,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';

class CategoryAllocationDto {
  @IsString()
  category: string;

  @IsNumber()
  @Min(0)
  @Max(1)
  ratio: number; // 0.0 ~ 1.0

  @IsNumber()
  @Min(1)
  priority: number; // 1이 가장 높은 우선순위
}

export class CreateRecommendationDto {
  @IsNumber()
  @Min(1000)
  @Type(() => Number)
  totalBudget: number;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CategoryAllocationDto)
  categories: CategoryAllocationDto[];

  @IsOptional()
  @IsString()
  @IsIn(['CHEAPEST', 'BEST_VALUE', 'PREMIUM'])
  priceStrategy?: 'CHEAPEST' | 'BEST_VALUE' | 'PREMIUM' = 'BEST_VALUE';

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  preferredBrands?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  excludeBrands?: string[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(5)
  @Type(() => Number)
  minRating?: number;

  @IsOptional()
  @IsBoolean()
  includeAlternatives?: boolean = true;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  @Type(() => Number)
  maxItemsPerCategory?: number = 5;
}
