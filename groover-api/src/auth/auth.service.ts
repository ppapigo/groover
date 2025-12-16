// src/auth/auth.service.ts
import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  private readonly accessTokenExpiry = '15m';
  private readonly refreshTokenExpiry = 7 * 24 * 60 * 60 * 1000; // 7일
  private readonly verificationTokenExpiry = 24 * 60 * 60 * 1000; // 24시간

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private emailService: EmailService,
  ) {}

  async register(registerDto: RegisterDto) {
  const { userId, email, password, name } = registerDto;

  // userId 중복 체크
  const existingUserId = await this.prisma.user.findUnique({
    where: { userId },
  });

  if (existingUserId) {
    throw new ConflictException('이미 사용 중인 아이디입니다.');
  }

  // email 중복 체크
  const existingEmail = await this.prisma.user.findUnique({
    where: { email },
  });

  if (existingEmail) {
    throw new ConflictException('이미 사용 중인 이메일입니다.');
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await this.prisma.user.create({
    data: {
      userId,
      email,
      passwordHash,
      name: name || userId,
      isVerified: false,
    },
  });

  // 인증 토큰 생성 및 이메일 발송
  await this.sendVerificationEmail(user.id, user.email, user.name);

  return {
    message: '회원가입이 완료되었습니다. 이메일을 확인하여 인증을 완료해주세요.',
    user: {
      id: user.id,
      userId: user.userId,
      email: user.email,
      name: user.name,
      isVerified: user.isVerified,
    },
  };
}

  async login(loginDto: LoginDto) {
  const { email, userId, password } = loginDto;

  if (!email && !userId) {
    throw new BadRequestException('이메일 또는 아이디를 입력해주세요.');
  }

  const user = await this.prisma.user.findFirst({
    where: email ? { email } : { userId },
  });

  if (!user) {
    throw new UnauthorizedException('아이디 또는 비밀번호가 올바르지 않습니다.');
  }

  // 비밀번호 확인
  if (user.passwordHash) {
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('아이디 또는 비밀번호가 올바르지 않습니다.');
    }
  } else {
    throw new UnauthorizedException('Google 로그인을 이용해주세요.');
  }

  // 이메일 인증 확인
  if (!user.isVerified) {
    throw new UnauthorizedException({
      message: '이메일 인증이 필요합니다. 이메일을 확인해주세요.',
      code: 'EMAIL_NOT_VERIFIED',
      email: user.email,
    });
  }

  // 계정 정지 확인
  if (user.suspendedUntil && user.suspendedUntil > new Date()) {
    throw new UnauthorizedException({
      message: `계정이 정지되었습니다. ${user.suspendedUntil.toLocaleDateString()}까지 로그인할 수 없습니다.`,
      code: 'ACCOUNT_SUSPENDED',
    });
  }

  const tokens = await this.generateTokens(user.id, user.email);

  // login 메서드 내 user 반환 부분
    return {
      user: {
        id: user.id,
        userId: user.userId,
        email: user.email,
        name: user.name,
        isVerified: user.isVerified,
        role: user.role,  // 추가
      },
      ...tokens,
    };
}

  // ========================================
  // 이메일 인증
  // ========================================

  async sendVerificationEmail(userId: string, email: string, name?: string) {
    // 기존 미사용 토큰 무효화
    await this.prisma.emailVerificationToken.updateMany({
      where: {
        userId,
        used: false,
      },
      data: {
        used: true,
      },
    });

    // 새 토큰 생성
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + this.verificationTokenExpiry);

    await this.prisma.emailVerificationToken.create({
      data: {
        token,
        userId,
        email,
        expiresAt,
      },
    });

    // 이메일 발송
    const sent = await this.emailService.sendVerificationEmail(email, token, name);

    if (!sent) {
      throw new BadRequestException('이메일 발송에 실패했습니다. 잠시 후 다시 시도해주세요.');
    }

    return { message: '인증 이메일이 발송되었습니다.' };
  }

  async verifyEmail(token: string) {
    const verificationToken = await this.prisma.emailVerificationToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!verificationToken) {
      throw new BadRequestException('유효하지 않은 인증 링크입니다.');
    }

    if (verificationToken.used) {
      throw new BadRequestException('이미 사용된 인증 링크입니다.');
    }

    if (verificationToken.expiresAt < new Date()) {
      throw new BadRequestException('인증 링크가 만료되었습니다. 새 인증 메일을 요청해주세요.');
    }

    // 토큰 사용 처리 및 유저 인증 완료
    await this.prisma.$transaction([
      this.prisma.emailVerificationToken.update({
        where: { id: verificationToken.id },
        data: {
          used: true,
          usedAt: new Date(),
        },
      }),
      this.prisma.user.update({
        where: { id: verificationToken.userId },
        data: {
          isVerified: true,
        },
      }),
    ]);

    // 토큰 발급 (자동 로그인)
    const tokens = await this.generateTokens(
      verificationToken.user.id,
      verificationToken.user.email,
    );

    return {
      message: '이메일 인증이 완료되었습니다.',
      user: {
        id: verificationToken.user.id,
        email: verificationToken.user.email,
        name: verificationToken.user.name,
        isVerified: true,
      },
      ...tokens,
    };
  }

  async resendVerificationEmail(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // 보안: 이메일 존재 여부 노출 방지
      return { message: '해당 이메일로 인증 메일이 발송되었습니다.' };
    }

    if (user.isVerified) {
      throw new BadRequestException('이미 인증된 계정입니다.');
    }

    // 최근 발송 체크 (스팸 방지 - 1분)
    const recentToken = await this.prisma.emailVerificationToken.findFirst({
      where: {
        userId: user.id,
        createdAt: {
          gte: new Date(Date.now() - 60 * 1000), // 1분 이내
        },
      },
    });

    if (recentToken) {
      throw new BadRequestException('잠시 후 다시 시도해주세요. (1분 대기)');
    }

    await this.sendVerificationEmail(user.id, user.email, user.name);

    return { message: '인증 이메일이 발송되었습니다.' };
  }

  // ========================================
  // 기존 메서드들
  // ========================================

  async refresh(refreshToken: string) {
    const storedToken = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    if (!storedToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (storedToken.expiresAt < new Date()) {
      await this.prisma.refreshToken.delete({
        where: { id: storedToken.id },
      });
      throw new UnauthorizedException('Refresh token expired');
    }

    // 기존 토큰 삭제 (Rotation)
    await this.prisma.refreshToken.delete({
      where: { id: storedToken.id },
    });

    // 새 토큰 발급
    const tokens = await this.generateTokens(
      storedToken.user.id,
      storedToken.user.email,
    );

    return tokens;
  }

  async logout(refreshToken: string) {
    await this.prisma.refreshToken.deleteMany({
      where: { token: refreshToken },
    });

    return { message: 'Logged out successfully' };
  }

  async logoutAll(userId: string) {
    await this.prisma.refreshToken.deleteMany({
      where: { userId },
    });

    return { message: 'Logged out from all devices' };
  }

  private async generateTokens(userId: string, email: string) {
    const payload = { sub: userId, email };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: this.accessTokenExpiry,
    });

    const refreshToken = crypto.randomBytes(64).toString('hex');

    await this.prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId,
        expiresAt: new Date(Date.now() + this.refreshTokenExpiry),
      },
    });

    // 오래된 토큰 정리 (유저당 최대 5개)
    const tokens = await this.prisma.refreshToken.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    if (tokens.length > 5) {
      const oldTokenIds = tokens.slice(5).map((t) => t.id);
      await this.prisma.refreshToken.deleteMany({
        where: { id: { in: oldTokenIds } },
      });
    }

    return { accessToken, refreshToken };
  }

  async validateUser(userId: string) {
  return this.prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      profileImageUrl: true,
      isVerified: true,
      role: true,  // 추가
    },
  });
}

  async cleanupExpiredTokens() {
    await this.prisma.refreshToken.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
      },
    });

    // 만료된 인증 토큰도 정리
    await this.prisma.emailVerificationToken.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
      },
    });
  }

  // ========================================
  // Google OAuth
  // ========================================

  async googleLogin(googleUser: {
    googleId: string;
    email: string;
    name: string;
    profileImageUrl?: string;
  }) {
    let user = await this.prisma.user.findFirst({
      where: {
        OR: [{ googleId: googleUser.googleId }, { email: googleUser.email }],
      },
    });

    if (user) {
      if (!user.googleId) {
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: {
            googleId: googleUser.googleId,
            profileImageUrl: user.profileImageUrl || googleUser.profileImageUrl,
            isVerified: true, // Google 로그인은 자동 인증
          },
        });
      }
    } else {
      user = await this.prisma.user.create({
        data: {
          email: googleUser.email,
          name: googleUser.name,
          googleId: googleUser.googleId,
          profileImageUrl: googleUser.profileImageUrl,
          passwordHash: '',
          isVerified: true, // Google 로그인은 자동 인증
        },
      });
    }

    const tokens = await this.generateTokens(user.id, user.email);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        profileImageUrl: user.profileImageUrl,
        isVerified: user.isVerified,
      },
      ...tokens,
    };
  }
}
