// src/auth/auth.controller.ts
// 보안 강화 버전 - 로그인 시도 제한

import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
  Get,
} from '@nestjs/common';
import { Throttle, SkipThrottle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * 회원가입
   * POST /v1/auth/register
   * 
   * Rate Limit: 분당 5회 (계정 생성 남용 방지)
   */
  @Post('register')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() dto: RegisterDto) {
    const result = await this.authService.register(dto);
    return {
      success: true,
      message: 'Registration successful',
      data: result,
    };
  }

  /**
   * 로그인
   * POST /v1/auth/login
   * 
   * Rate Limit: 10초당 3회 (브루트포스 방지)
   */
  @Post('login')
  @Throttle({ default: { limit: 3, ttl: 10000 } })  // 🔒 10초당 3회
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto) {
    const result = await this.authService.login(dto);
    return {
      success: true,
      message: 'Login successful',
      data: result,
    };
  }

  /**
   * 내 정보 조회
   * GET /v1/auth/me
   * 
   * Rate Limit: 기본값 적용
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  @SkipThrottle()  // 인증된 요청은 Rate Limit 완화
  async getMe(@Request() req) {
    return {
      success: true,
      data: req.user,
    };
  }

  /**
   * 비밀번호 재설정 요청
   * POST /v1/auth/forgot-password
   * 
   * Rate Limit: 분당 3회 (이메일 스팸 방지)
   */
  @Post('forgot-password')
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body('email') email: string) {
    // TODO: 비밀번호 재설정 이메일 발송
    return {
      success: true,
      message: 'If the email exists, a reset link will be sent',
    };
  }
}
