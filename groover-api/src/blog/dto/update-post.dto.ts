// src/blog/dto/update-post.dto.ts
import {
  IsString,
  IsArray,
  IsOptional,
  IsBoolean,
  IsObject,
  MaxLength,
  MinLength,
  ArrayMaxSize,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PostMetadataDto } from './create-post.dto';

export class UpdatePostDto {
  @IsOptional()
  @IsString()
  @MinLength(1, { message: '제목을 입력해주세요.' })
  @MaxLength(200, { message: '제목은 200자 이내로 입력해주세요.' })
  title?: string;

  @IsOptional()
  @IsString()
  @MinLength(10, { message: '본문은 최소 10자 이상 입력해주세요.' })
  @MaxLength(50000, { message: '본문은 50000자 이내로 입력해주세요.' })
  content?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10, { message: '태그는 최대 10개까지 가능합니다.' })
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(500)
  previewImage?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  excerpt?: string;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => PostMetadataDto)
  metadata?: PostMetadataDto;

  @IsOptional()
  @IsBoolean()
  publish?: boolean;
}