// src/dm/dto/index.ts
import {
  IsString,
  IsOptional,
  IsEnum,
  MaxLength,
  IsObject,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum MessageType {
  TEXT = 'text',
  IMAGE = 'image',
  LINK = 'link',
  SYSTEM = 'system',
}

export class SendMessageDto {
  @IsString()
  @MaxLength(2000, { message: '메시지는 2000자 이내로 입력해주세요.' })
  content: string;

  @IsOptional()
  @IsEnum(MessageType)
  messageType?: MessageType = MessageType.TEXT;

  @IsOptional()
  @IsObject()
  metadata?: {
    imageUrl?: string;
    linkUrl?: string;
    linkTitle?: string;
    linkDescription?: string;
    linkImage?: string;
  };
}

export class StartThreadDto {
  @IsString()
  targetUserId: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  initialMessage?: string;
}

export class ThreadQueryDto {
  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 20;
}

export class MessageQueryDto {
  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 50;
}

export class BlockUserDto {
  @IsString()
  targetUserId: string;
}

export class ReportMessageDto {
  @IsString()
  targetUserId: string;

  @IsOptional()
  @IsString()
  messageId?: string;

  @IsString()
  @MaxLength(500)
  reason: string;
}

export class SearchMessagesDto {
  @IsString()
  @MaxLength(100)
  query: string;

  @IsOptional()
  @IsString()
  threadId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 20;
}
