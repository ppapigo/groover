// src/auth/guards/optional-auth.guard.ts

import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class OptionalAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    // JWT 인증 시도
    return super.canActivate(context);
  }

  handleRequest(err: any, user: any) {
    // 에러가 있거나 유저가 없어도 통과
    // user가 없으면 undefined로 설정
    return user || undefined;
  }
}
