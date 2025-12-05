// src/dm/dto/send-message.dto.ts

import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendMessageDto {
  @ApiProperty({ description: '메시지 내용' })
  @IsString()
  @IsNotEmpty({ message: '메시지 내용을 입력해주세요.' })
  @MaxLength(2000, { message: '메시지는 2000자 이내로 입력해주세요.' })
  content: string;

  @ApiProperty({ description: '메시지 타입', required: false })
  @IsString()
  @IsOptional()
  messageType?: 'text' | 'image' | 'link';
}

export class SendMessageResponseDto {
  success: boolean;
  messageId?: string;
  blocked?: boolean;
  blockReason?: string;
  filteredContent?: string;
}
