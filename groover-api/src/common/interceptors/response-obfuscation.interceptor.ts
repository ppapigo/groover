// src/common/interceptors/response-obfuscation.interceptor.ts
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Request, Response } from 'express';

/**
 * 리버스 엔지니어링 방어 인터셉터
 * 
 * 기능:
 * 1. 응답 구조 일관성 유지 (API 구조 추론 어렵게)
 * 2. 타이밍 정보 숨기기
 * 3. 서버 정보 숨기기
 * 4. 디버그 정보 제거
 * 5. 응답 지연 추가 (타이밍 공격 방어)
 */
@Injectable()
export class ResponseObfuscationInterceptor implements NestInterceptor {
  private readonly logger = new Logger(ResponseObfuscationInterceptor.name);
  
  // 프로덕션 모드 여부
  private readonly isProduction = process.env.NODE_ENV === 'production';
  
  // 최소 응답 시간 (ms) - 타이밍 공격 방어
  private readonly MIN_RESPONSE_TIME = 50;
  
  // 응답 시간 지터 (ms) - 무작위성 추가
  private readonly RESPONSE_JITTER = 30;

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const startTime = Date.now();

    // 서버 정보 헤더 제거
    this.removeServerHeaders(response);
    
    // 보안 헤더 추가
    this.addSecurityHeaders(response);

    return next.handle().pipe(
      map(async (data) => {
        // 응답 처리 시간
        const processingTime = Date.now() - startTime;
        
        // 최소 응답 시간 보장 (타이밍 공격 방어)
        if (this.isProduction) {
          const delay = this.calculateDelay(processingTime);
          if (delay > 0) {
            await this.sleep(delay);
          }
        }

        // 응답 데이터 정규화
        return this.normalizeResponse(data, request);
      }),
    );
  }

  /**
   * 서버 정보 헤더 제거
   */
  private removeServerHeaders(response: Response): void {
    response.removeHeader('X-Powered-By');
    response.removeHeader('Server');
    response.removeHeader('X-AspNet-Version');
    response.removeHeader('X-AspNetMvc-Version');
  }

  /**
   * 보안 헤더 추가
   */
  private addSecurityHeaders(response: Response): void {
    // 브라우저 캐싱 제어 (민감한 데이터)
    response.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.setHeader('Pragma', 'no-cache');
    response.setHeader('Expires', '0');
    
    // Content sniffing 방지
    response.setHeader('X-Content-Type-Options', 'nosniff');
    
    // Clickjacking 방지
    response.setHeader('X-Frame-Options', 'DENY');
    
    // XSS 필터
    response.setHeader('X-XSS-Protection', '1; mode=block');
    
    // Referrer 정보 제한
    response.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    // Feature Policy
    response.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  }

  /**
   * 응답 정규화 (구조 일관성)
   */
  private normalizeResponse(data: any, request: Request): any {
    // null/undefined 처리
    if (data === null || data === undefined) {
      return {
        success: true,
        data: null,
        timestamp: this.isProduction ? undefined : Date.now(),
      };
    }

    // 이미 정규화된 응답이면 그대로 반환
    if (data.success !== undefined) {
      return this.sanitizeResponse(data);
    }

    // 배열인 경우
    if (Array.isArray(data)) {
      return {
        success: true,
        data: data.map(item => this.sanitizeObject(item)),
        count: data.length,
      };
    }

    // 객체인 경우
    if (typeof data === 'object') {
      return {
        success: true,
        data: this.sanitizeObject(data),
      };
    }

    // 원시값인 경우
    return {
      success: true,
      data,
    };
  }

  /**
   * 응답 데이터 정제 (민감 정보 제거)
   */
  private sanitizeResponse(data: any): any {
    if (!data || typeof data !== 'object') {
      return data;
    }

    const sanitized = { ...data };

    // 프로덕션에서 디버그 정보 제거
    if (this.isProduction) {
      delete sanitized.stack;
      delete sanitized.trace;
      delete sanitized.debug;
      delete sanitized.query;
      delete sanitized.sql;
      delete sanitized.processingTimeMs;
    }

    // data 필드가 있으면 재귀적으로 정제
    if (sanitized.data) {
      sanitized.data = this.sanitizeObject(sanitized.data);
    }

    return sanitized;
  }

  /**
   * 객체 정제 (민감 필드 제거/마스킹)
   */
  private sanitizeObject(obj: any): any {
    if (!obj || typeof obj !== 'object') {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeObject(item));
    }

    const sanitized: any = {};
    const sensitiveFields = [
      'password', 'passwordHash', 'secret', 'apiKey', 'api_key',
      'token', 'refreshToken', 'accessToken', 'privateKey',
      'creditCard', 'ssn', 'socialSecurityNumber',
    ];

    const fieldsToRemove = [
      '__v', '_id', 'deletedAt', 'internalId', 'internalNotes',
    ];

    for (const [key, value] of Object.entries(obj)) {
      // 제거할 필드
      if (fieldsToRemove.includes(key)) {
        continue;
      }

      // 민감 필드 마스킹
      if (sensitiveFields.some(f => key.toLowerCase().includes(f.toLowerCase()))) {
        sanitized[key] = '[REDACTED]';
        continue;
      }

      // 재귀적으로 처리
      if (value && typeof value === 'object') {
        sanitized[key] = this.sanitizeObject(value);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  /**
   * 응답 지연 계산 (타이밍 공격 방어)
   */
  private calculateDelay(processingTime: number): number {
    // 최소 응답 시간에 도달하도록 지연
    const baseDelay = Math.max(0, this.MIN_RESPONSE_TIME - processingTime);
    
    // 무작위 지터 추가 (0 ~ RESPONSE_JITTER ms)
    const jitter = Math.random() * this.RESPONSE_JITTER;
    
    return baseDelay + jitter;
  }

  /**
   * 지연 함수
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
