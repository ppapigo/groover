// src/common/filters/secure-error.filter.ts
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

/**
 * 보안 에러 필터
 * 
 * 기능:
 * 1. 내부 에러 정보 숨김
 * 2. 일관된 에러 응답 구조
 * 3. 에러 로깅 (내부용)
 * 4. 스택 트레이스 제거
 * 5. 민감한 에러 메시지 제네릭화
 */
@Catch()
export class SecureErrorFilter implements ExceptionFilter {
  private readonly logger = new Logger(SecureErrorFilter.name);
  private readonly isProduction = process.env.NODE_ENV === 'production';

  // 에러 메시지 매핑 (내부 메시지 → 공개 메시지)
  private readonly ERROR_MESSAGES: Record<number, string> = {
    400: 'Invalid request. Please check your input.',
    401: 'Authentication required.',
    403: 'Access denied.',
    404: 'Resource not found.',
    405: 'Method not allowed.',
    408: 'Request timeout.',
    409: 'Conflict with existing resource.',
    413: 'Request too large.',
    415: 'Unsupported media type.',
    422: 'Unable to process request.',
    429: 'Too many requests. Please try again later.',
    500: 'An unexpected error occurred.',
    502: 'Service temporarily unavailable.',
    503: 'Service temporarily unavailable.',
    504: 'Request timeout.',
  };

  // 내부 에러 패턴 (절대 노출 금지)
  private readonly SENSITIVE_PATTERNS = [
    /prisma/i,
    /database/i,
    /sql/i,
    /postgres/i,
    /mysql/i,
    /mongo/i,
    /connection refused/i,
    /ECONNREFUSED/i,
    /timeout/i,
    /deadlock/i,
    /constraint/i,
    /foreign key/i,
    /unique constraint/i,
    /null value/i,
    /column.*does not exist/i,
    /table.*does not exist/i,
    /relation.*does not exist/i,
    /invalid input syntax/i,
    /out of memory/i,
    /stack overflow/i,
    /heap/i,
    /segmentation fault/i,
    /internal server error/i,
    /secret/i,
    /api[_-]?key/i,
    /password/i,
    /token/i,
    /credential/i,
  ];

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    // 에러 정보 추출
    const { status, message, internalMessage, stack } = this.extractErrorInfo(exception);

    // 내부 로깅 (상세 정보 포함)
    this.logError(request, status, internalMessage, stack);

    // 공개 에러 메시지 결정
    const publicMessage = this.getPublicMessage(status, message);

    // 에러 응답 ID (추적용)
    const errorId = this.generateErrorId();

    // 응답 전송
    response.status(status).json({
      success: false,
      error: {
        status,
        message: publicMessage,
        errorId,  // 지원팀 문의 시 사용
        ...(this.isProduction ? {} : {
          // 개발 환경에서만 상세 정보 표시
          debug: {
            originalMessage: message,
            path: request.url,
            method: request.method,
            timestamp: new Date().toISOString(),
          },
        }),
      },
    });
  }

  /**
   * 에러 정보 추출
   */
  private extractErrorInfo(exception: unknown): {
    status: number;
    message: string;
    internalMessage: string;
    stack?: string;
  } {
    // HttpException
    if (exception instanceof HttpException) {
      const response = exception.getResponse();
      let message = '';

      if (typeof response === 'string') {
        message = response;
      } else if (typeof response === 'object' && response !== null) {
        const resp = response as any;
        message = resp.message || resp.error || 'Unknown error';
        
        // 배열인 경우 (class-validator 에러)
        if (Array.isArray(message)) {
          message = message[0];
        }
      }

      return {
        status: exception.getStatus(),
        message,
        internalMessage: message,
        stack: exception.stack,
      };
    }

    // Prisma 에러
    if (this.isPrismaError(exception)) {
      return {
        status: this.getPrismaErrorStatus(exception),
        message: 'Database operation failed',
        internalMessage: (exception as any).message,
        stack: (exception as any).stack,
      };
    }

    // 일반 Error
    if (exception instanceof Error) {
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: exception.message,
        internalMessage: exception.message,
        stack: exception.stack,
      };
    }

    // 알 수 없는 에러
    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Unknown error',
      internalMessage: String(exception),
    };
  }

  /**
   * Prisma 에러 확인
   */
  private isPrismaError(exception: unknown): boolean {
    if (!exception || typeof exception !== 'object') {
      return false;
    }
    
    const error = exception as any;
    return error.code?.startsWith?.('P') || 
           error.clientVersion !== undefined ||
           error.name?.includes?.('Prisma');
  }

  /**
   * Prisma 에러 상태 코드 결정
   */
  private getPrismaErrorStatus(exception: any): number {
    const code = exception.code;

    switch (code) {
      case 'P2002':  // Unique constraint
        return HttpStatus.CONFLICT;
      case 'P2025':  // Record not found
        return HttpStatus.NOT_FOUND;
      case 'P2003':  // Foreign key constraint
        return HttpStatus.BAD_REQUEST;
      default:
        return HttpStatus.INTERNAL_SERVER_ERROR;
    }
  }

  /**
   * 공개 메시지 결정
   */
  private getPublicMessage(status: number, originalMessage: string): string {
    // 프로덕션이 아니면 원본 메시지 반환 (민감 정보만 제거)
    if (!this.isProduction) {
      return this.sanitizeMessage(originalMessage);
    }

    // 민감한 패턴이 포함되어 있으면 제네릭 메시지 사용
    if (this.containsSensitiveInfo(originalMessage)) {
      return this.ERROR_MESSAGES[status] || this.ERROR_MESSAGES[500];
    }

    // 400번대 에러는 사용자 입력 관련이므로 메시지 유지 (정제 후)
    if (status >= 400 && status < 500) {
      return this.sanitizeMessage(originalMessage);
    }

    // 500번대 에러는 항상 제네릭 메시지
    return this.ERROR_MESSAGES[status] || this.ERROR_MESSAGES[500];
  }

  /**
   * 민감 정보 포함 여부 확인
   */
  private containsSensitiveInfo(message: string): boolean {
    return this.SENSITIVE_PATTERNS.some(pattern => pattern.test(message));
  }

  /**
   * 메시지 정제
   */
  private sanitizeMessage(message: string): string {
    let sanitized = message;

    // 민감 패턴 대체
    for (const pattern of this.SENSITIVE_PATTERNS) {
      sanitized = sanitized.replace(pattern, '[REDACTED]');
    }

    // 파일 경로 제거
    sanitized = sanitized.replace(/[A-Z]:\\[^\s]+/gi, '[PATH]');
    sanitized = sanitized.replace(/\/[^\s]+\.(js|ts)/gi, '[PATH]');

    // IP 주소 제거
    sanitized = sanitized.replace(/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/g, '[IP]');

    // 포트 번호 제거
    sanitized = sanitized.replace(/:\d{4,5}/g, ':[PORT]');

    return sanitized;
  }

  /**
   * 에러 로깅
   */
  private logError(
    request: Request,
    status: number,
    message: string,
    stack?: string,
  ): void {
    const logData = {
      timestamp: new Date().toISOString(),
      method: request.method,
      url: request.url,
      ip: this.getClientIp(request),
      userId: (request as any).user?.id,
      userAgent: request.headers['user-agent'],
      status,
      message,
    };

    if (status >= 500) {
      this.logger.error(
        `[${status}] ${request.method} ${request.url}: ${message}`,
        stack,
      );
    } else if (status >= 400) {
      this.logger.warn(`[${status}] ${request.method} ${request.url}: ${message}`);
    }

    // 보안 관련 에러는 별도 로깅
    if (status === 401 || status === 403 || status === 429) {
      this.logger.log(`Security event: ${JSON.stringify(logData)}`);
    }
  }

  /**
   * 클라이언트 IP 추출
   */
  private getClientIp(request: Request): string {
    const forwarded = request.headers['x-forwarded-for'];
    if (forwarded) {
      return (forwarded as string).split(',')[0].trim();
    }
    return request.ip || 'unknown';
  }

  /**
   * 에러 ID 생성
   */
  private generateErrorId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `ERR-${timestamp}-${random}`.toUpperCase();
  }
}
