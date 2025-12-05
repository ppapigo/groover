// src/admin/guards/admin.guard.ts

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AdminGuard implements CanActivate {
  // 관리자 이메일 목록 (환경변수 또는 하드코딩)
  // 나중에 DB 기반 역할 시스템으로 확장 가능
  private readonly adminEmails: string[];

  constructor(private readonly configService: ConfigService) {
    const admins = this.configService.get<string>('ADMIN_EMAILS') || '';
    this.adminEmails = admins.split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
    
    // 기본 관리자 (개발용)
    if (this.adminEmails.length === 0) {
      this.adminEmails = ['admin@groover.com'];
    }
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('인증이 필요합니다.');
    }

    const isAdmin = this.adminEmails.includes(user.email?.toLowerCase());

    if (!isAdmin) {
      throw new ForbiddenException('관리자 권한이 필요합니다.');
    }

    return true;
  }
}
