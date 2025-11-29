// src/groover-code/dto/save-to-cart.dto.ts
import { IsString, IsOptional, Matches } from 'class-validator';

export class SaveToCartDto {
  @IsString()
  @Matches(/^GRV\d+-/, { message: 'Invalid Groover Code format' })
  grooverCode: string;

  @IsOptional()
  @IsString()
  cartName?: string;
}
