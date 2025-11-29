// src/groover-code/dto/encode-cart.dto.ts
import { IsUUID } from 'class-validator';

export class EncodeCartDto {
  @IsUUID()
  cartId: string;
}
