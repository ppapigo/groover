// src/auth/auth.controller.ts
import {
  Controller,
  Post,
  Body,
  Get,
  Query,
  UseGuards,
  Request,
  Res,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { ConfigService } from '@nestjs/config';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    const result = await this.authService.register(registerDto);
    return {
      success: true,
      data: result,
    };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.login(loginDto);

    // Refresh Token을 HttpOnly 쿠키로 설정
    response.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7일
      path: '/',
    });

    return {
      success: true,
      data: {
        user: result.user,
        accessToken: result.accessToken,
      },
    };
  }

  // ========================================
  // 이메일 인증
  // ========================================

  @Get('verify')
  async verifyEmail(
    @Query('token') token: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.verifyEmail(token);

    // 자동 로그인을 위한 쿠키 설정
    response.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
    });

    return {
      success: true,
      data: {
        message: result.message,
        user: result.user,
        accessToken: result.accessToken,
      },
    };
  }

  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  async resendVerification(@Body('email') email: string) {
    const result = await this.authService.resendVerificationEmail(email);
    return {
      success: true,
      data: result,
    };
  }

  // ========================================
  // 토큰 관리
  // ========================================

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Body('refreshToken') bodyToken: string,
    @Request() req,
    @Res({ passthrough: true }) response: Response,
  ) {
    const refreshToken = bodyToken || req.cookies?.refreshToken;

    if (!refreshToken) {
      return {
        success: false,
        message: 'Refresh token is required',
      };
    }

    const tokens = await this.authService.refresh(refreshToken);

    response.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
    });

    return {
      success: true,
      data: {
        accessToken: tokens.accessToken,
      },
    };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @Body('refreshToken') bodyToken: string,
    @Request() req,
    @Res({ passthrough: true }) response: Response,
  ) {
    const refreshToken = bodyToken || req.cookies?.refreshToken;

    if (refreshToken) {
      await this.authService.logout(refreshToken);
    }

    response.clearCookie('refreshToken', { path: '/' });

    return {
      success: true,
      message: 'Logged out successfully',
    };
  }

  @Post('logout-all')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logoutAll(@Request() req, @Res({ passthrough: true }) response: Response) {
    await this.authService.logoutAll(req.user.id);

    response.clearCookie('refreshToken', { path: '/' });

    return {
      success: true,
      message: 'Logged out from all devices',
    };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMe(@Request() req) {
    const user = await this.authService.validateUser(req.user.id);
    return {
      success: true,
      data: user,
    };
  }

  // ========================================
  // 비밀번호 재설정 (추후 구현)
  // ========================================

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body('email') email: string) {
    // TODO: 비밀번호 재설정 이메일 발송
    return {
      success: true,
      message: '비밀번호 재설정 메일이 발송되었습니다.',
    };
  }

  // ========================================
  // Google OAuth
  // ========================================

  @Get('google')
 @UseGuards(GoogleAuthGuard)
  async googleAuth() {
    // Google로 리다이렉트됨
  }

  @Get('google/callback')
 @UseGuards(GoogleAuthGuard)
  async googleCallback(@Request() req, @Res() response: Response) {
    const result = await this.authService.googleLogin(req.user);

    response.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
    });

    const frontendUrl = this.configService.get('FRONTEND_URL') || 'https://www.grooverapp.com';
    response.redirect(
      `${frontendUrl}/auth/callback?token=${result.accessToken}`,
    );
  }
}
