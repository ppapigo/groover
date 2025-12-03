// src/auth/guards/optional-jwt-auth.guard.ts
import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * 선택적 JWT 인증 Guard
 * - 토큰이 있으면 검증하고 req.user에 사용자 정보 추가
 * - 토큰이 없어도 요청 통과 (req.user = undefined)
 * - 인증/비인증 모두 접근 가능한 엔드포인트에 사용
 */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  // 인증 실패해도 요청 통과
  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    // 에러나 user가 없어도 그냥 통과
    // user가 있으면 반환, 없으면 undefined
    return user || undefined;
  }
}
