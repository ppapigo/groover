// src/carts/dto/add-item.dto.ts
import { IsString, IsOptional, IsNumber, IsUUID, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class AddItemDto {
  @IsUUID()
  productId: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  quantity?: number = 1;
}
