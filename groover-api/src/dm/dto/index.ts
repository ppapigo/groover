// src/dm/dto/send-message.dto.ts
import {
  IsString,
  IsOptional,
  IsEnum,
  MaxLength,
  IsObject,
} from 'class-validator';

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

// src/dm/dto/start-thread.dto.ts
export class StartThreadDto {
  @IsString()
  targetUserId: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  initialMessage?: string;
}

// src/dm/dto/thread-query.dto.ts
import { IsOptional, IsString, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

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

// src/dm/dto/block.dto.ts
export class BlockUserDto {
  @IsString()
  targetUserId: string;
}

// src/dm/dto/report.dto.ts
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

// src/dm/dto/search.dto.ts
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
