// src/auth/auth.controller.ts
import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
  Get,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { Throttle, SkipThrottle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { GoogleAuthGuard } from './guards/google-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * 회원가입
   * POST /v1/auth/register
   */
  @Post('register')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @HttpCode(HttpStatus.CREATED)
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.register(dto);
    
    // Refresh Token을 HttpOnly 쿠키로 설정
    this.setRefreshTokenCookie(res, result.refreshToken);

    return {
      success: true,
      message: 'Registration successful',
      data: {
        user: result.user,
        accessToken: result.accessToken,
      },
    };
  }

  /**
   * 로그인
   * POST /v1/auth/login
   */
  @Post('login')
  @Throttle({ default: { limit: 3, ttl: 10000 } })
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(dto);
    
    // Refresh Token을 HttpOnly 쿠키로 설정
    this.setRefreshTokenCookie(res, result.refreshToken);

    return {
      success: true,
      message: 'Login successful',
      data: {
        user: result.user,
        accessToken: result.accessToken,
      },
    };
  }

  /**
   * 토큰 갱신
   * POST /v1/auth/refresh
   */
  @Post('refresh')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Request() req,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = req.cookies?.refreshToken;
    
    if (!refreshToken) {
      return {
        success: false,
        message: 'Refresh token not found',
      };
    }

    const tokens = await this.authService.refresh(refreshToken);
    
    // 새 Refresh Token 쿠키 설정
    this.setRefreshTokenCookie(res, tokens.refreshToken);

    return {
      success: true,
      data: {
        accessToken: tokens.accessToken,
      },
    };
  }

  /**
   * 로그아웃
   * POST /v1/auth/logout
   */
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @Request() req,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = req.cookies?.refreshToken;
    
    if (refreshToken) {
      await this.authService.logout(refreshToken);
    }

    // 쿠키 삭제
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
    });

    return {
      success: true,
      message: 'Logged out successfully',
    };
  }

  /**
   * 모든 기기에서 로그아웃
   * POST /v1/auth/logout-all
   */
  @Post('logout-all')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logoutAll(
    @Request() req,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.authService.logoutAll(req.user.id);

    // 쿠키 삭제
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
    });

    return {
      success: true,
      message: 'Logged out from all devices',
    };
  }

  /**
   * 내 정보 조회
   * GET /v1/auth/me
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  @SkipThrottle()
  async getMe(@Request() req) {
    return {
      success: true,
      data: req.user,
    };
  }

  /**
   * 비밀번호 재설정 요청
   * POST /v1/auth/forgot-password
   */
  @Post('forgot-password')
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body('email') email: string) {
    return {
      success: true,
      message: 'If the email exists, a reset link will be sent',
    };
  }
  // ========================================
  // Google OAuth
  // ========================================

  /**
   * Google 로그인 시작
   * GET /v1/auth/google
   */
  @Get('google')
  @UseGuards(GoogleAuthGuard)
  async googleAuth() {
    // GoogleAuthGuard가 Google로 리다이렉트
  }

  /**
   * Google 로그인 콜백
   * GET /v1/auth/google/callback
   */
  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  async googleAuthCallback(
    @Request() req,
    @Res() res: Response,
  ) {
    const result = await this.authService.googleLogin(req.user);
    
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
    res.redirect(`${frontendUrl}/auth/callback?token=${result.accessToken}`);
  }
  /**
   * Refresh Token 쿠키 설정 헬퍼
   */
  private setRefreshTokenCookie(res: Response, token: string) {
    res.cookie('refreshToken', token, {
      httpOnly: true,                                    // JS 접근 불가
      secure: process.env.NODE_ENV === 'production',    // HTTPS만
      sameSite: 'strict',                               // CSRF 방지
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000,                  // 7일
    });
  }
}