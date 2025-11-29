// src/groover-code/dto/decode-code.dto.ts
import { IsString, Matches } from 'class-validator';

export class DecodeCodeDto {
  @IsString()
  @Matches(/^GRV\d+-/, { message: 'Invalid Groover Code format' })
  grooverCode: string;
}
