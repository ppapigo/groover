import { IsEmail, IsString, MinLength, IsOptional, Matches } from 'class-validator';

export class RegisterDto {
  @IsString()
  @MinLength(4)
  @Matches(/^[a-zA-Z0-9_]+$/, { message: '아이디는 영문, 숫자, 언더스코어만 사용 가능합니다.' })
  userId: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsOptional()
  @IsString()
  name?: string;
}