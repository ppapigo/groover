// src/common/guards/anti-scraping.guard.ts
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';

/**
 * 요청 추적 데이터
 */
interface RequestTracker {
  count: number;
  firstRequest: number;
  lastRequest: number;
  endpoints: Map<string, number>;  // 엔드포인트별 호출 횟수
  patterns: string[];              // 요청 패턴 (순서)
  suspiciousScore: number;         // 의심 점수
}

/**
 * 차단된 IP/User 정보
 */
interface BlockedEntity {
  blockedAt: number;
  reason: string;
  duration: number;  // ms
}

@Injectable()
export class AntiScrapingGuard implements CanActivate {
  private readonly logger = new Logger(AntiScrapingGuard.name);
  
  // IP별 요청 추적
  private readonly ipTrackers = new Map<string, RequestTracker>();
  
  // User별 요청 추적
  private readonly userTrackers = new Map<string, RequestTracker>();
  
  // 차단 목록
  private readonly blockedIps = new Map<string, BlockedEntity>();
  private readonly blockedUsers = new Map<string, BlockedEntity>();

  // ============================================
  // 설정값
  // ============================================
  private readonly CONFIG = {
    // 시간 윈도우 (ms)
    TIME_WINDOW: 60000,  // 1분
    
    // IP 기반 제한
    MAX_REQUESTS_PER_IP: 60,           // 분당 최대 요청
    MAX_UNIQUE_ENDPOINTS_PER_IP: 30,   // 분당 최대 고유 엔드포인트
    
    // User 기반 제한
    MAX_REQUESTS_PER_USER: 120,        // 분당 최대 요청
    MAX_UNIQUE_ENDPOINTS_PER_USER: 50,
    
    // 패턴 감지
    SEQUENTIAL_PATTERN_THRESHOLD: 10,  // 순차적 요청 패턴 임계값
    SUSPICIOUS_SCORE_THRESHOLD: 100,   // 의심 점수 임계값
    
    // 차단 시간 (ms)
    BLOCK_DURATION_SHORT: 300000,      // 5분
    BLOCK_DURATION_MEDIUM: 1800000,    // 30분
    BLOCK_DURATION_LONG: 86400000,     // 24시간
    
    // 클린업 주기 (ms)
    CLEANUP_INTERVAL: 300000,          // 5분마다 정리
  };

  // 스크래핑 의심 패턴
  private readonly SUSPICIOUS_PATTERNS = {
    // User-Agent 패턴
    BOT_USER_AGENTS: [
      /bot/i, /crawler/i, /spider/i, /scraper/i,
      /curl/i, /wget/i, /python-requests/i, /axios/i,
      /node-fetch/i, /go-http-client/i, /java/i,
      /phantom/i, /selenium/i, /puppeteer/i, /playwright/i,
      /headless/i, /chrome-lighthouse/i,
    ],
    
    // 순차적 ID 요청 패턴 (예: /products/1, /products/2, ...)
    SEQUENTIAL_ID_PATTERN: /\/(\d+)$/,
    
    // 페이지네이션 스크래핑 패턴
    PAGINATION_PATTERN: /[?&](page|offset|skip|cursor)=\d+/i,
  };

  constructor(private reflector: Reflector) {
    // 주기적 정리
    setInterval(() => this.cleanup(), this.CONFIG.CLEANUP_INTERVAL);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    
    const ip = this.getClientIp(request);
    const userId = (request as any).user?.id;
    const endpoint = `${request.method} ${request.path}`;
    const userAgent = request.headers['user-agent'] || '';

    // 1. 차단 목록 확인
    if (this.isBlocked(ip, userId)) {
      throw new HttpException(
        { message: 'Too many requests. Please try again later.' },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // 2. User-Agent 검사
    if (this.isSuspiciousUserAgent(userAgent)) {
      this.incrementSuspiciousScore(ip, userId, 20, 'Suspicious User-Agent');
    }

    // 3. 요청 추적 및 분석
    this.trackRequest(ip, userId, endpoint, request);

    // 4. 스크래핑 패턴 감지
    const scraping = this.detectScrapingPattern(ip, userId, endpoint, request);
    if (scraping.detected) {
      this.handleScrapingDetected(ip, userId, scraping.reason);
      throw new HttpException(
        { message: 'Unusual activity detected. Please try again later.' },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // 5. 속도 제한 확인
    if (this.isRateLimitExceeded(ip, userId)) {
      this.handleRateLimitExceeded(ip, userId);
      throw new HttpException(
        { message: 'Rate limit exceeded. Please slow down.' },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }

  /**
   * 클라이언트 IP 추출
   */
  private getClientIp(request: Request): string {
    const forwarded = request.headers['x-forwarded-for'];
    if (forwarded) {
      const ips = (forwarded as string).split(',');
      return ips[0].trim();
    }
    return request.ip || request.socket.remoteAddress || 'unknown';
  }

  /**
   * 차단 여부 확인
   */
  private isBlocked(ip: string, userId?: string): boolean {
    const now = Date.now();
    
    // IP 차단 확인
    const ipBlock = this.blockedIps.get(ip);
    if (ipBlock && now < ipBlock.blockedAt + ipBlock.duration) {
      return true;
    } else if (ipBlock) {
      this.blockedIps.delete(ip);
    }
    
    // User 차단 확인
    if (userId) {
      const userBlock = this.blockedUsers.get(userId);
      if (userBlock && now < userBlock.blockedAt + userBlock.duration) {
        return true;
      } else if (userBlock) {
        this.blockedUsers.delete(userId);
      }
    }
    
    return false;
  }

  /**
   * User-Agent 검사
   */
  private isSuspiciousUserAgent(userAgent: string): boolean {
    // 빈 User-Agent
    if (!userAgent || userAgent.length < 10) {
      return true;
    }
    
    // 봇 패턴 매칭
    return this.SUSPICIOUS_PATTERNS.BOT_USER_AGENTS.some(
      pattern => pattern.test(userAgent)
    );
  }

  /**
   * 요청 추적
   */
  private trackRequest(
    ip: string,
    userId: string | undefined,
    endpoint: string,
    request: Request,
  ): void {
    const now = Date.now();
    
    // IP 추적
    this.updateTracker(this.ipTrackers, ip, endpoint, now);
    
    // User 추적
    if (userId) {
      this.updateTracker(this.userTrackers, userId, endpoint, now);
    }
  }

  /**
   * 추적 데이터 업데이트
   */
  private updateTracker(
    trackers: Map<string, RequestTracker>,
    key: string,
    endpoint: string,
    now: number,
  ): void {
    let tracker = trackers.get(key);
    
    if (!tracker || now - tracker.firstRequest > this.CONFIG.TIME_WINDOW) {
      // 새 윈도우 시작
      tracker = {
        count: 0,
        firstRequest: now,
        lastRequest: now,
        endpoints: new Map(),
        patterns: [],
        suspiciousScore: tracker?.suspiciousScore || 0,
      };
      trackers.set(key, tracker);
    }
    
    tracker.count++;
    tracker.lastRequest = now;
    tracker.endpoints.set(endpoint, (tracker.endpoints.get(endpoint) || 0) + 1);
    
    // 패턴 기록 (최근 50개만)
    tracker.patterns.push(endpoint);
    if (tracker.patterns.length > 50) {
      tracker.patterns.shift();
    }
  }

  /**
   * 스크래핑 패턴 감지
   */
  private detectScrapingPattern(
    ip: string,
    userId: string | undefined,
    endpoint: string,
    request: Request,
  ): { detected: boolean; reason: string } {
    const tracker = userId 
      ? this.userTrackers.get(userId) 
      : this.ipTrackers.get(ip);
    
    if (!tracker) {
      return { detected: false, reason: '' };
    }

    // 1. 순차적 ID 요청 감지
    if (this.detectSequentialIdPattern(tracker.patterns)) {
      return { detected: true, reason: 'Sequential ID access pattern' };
    }

    // 2. 과도한 페이지네이션 감지
    if (this.detectPaginationScraping(tracker.patterns, request.url)) {
      return { detected: true, reason: 'Pagination scraping pattern' };
    }

    // 3. 너무 빠른 요청 간격
    if (this.detectRapidRequests(tracker)) {
      return { detected: true, reason: 'Rapid request pattern' };
    }

    // 4. 의심 점수 초과
    if (tracker.suspiciousScore >= this.CONFIG.SUSPICIOUS_SCORE_THRESHOLD) {
      return { detected: true, reason: 'Suspicious score exceeded' };
    }

    return { detected: false, reason: '' };
  }

  /**
   * 순차적 ID 패턴 감지
   */
  private detectSequentialIdPattern(patterns: string[]): boolean {
    if (patterns.length < this.CONFIG.SEQUENTIAL_PATTERN_THRESHOLD) {
      return false;
    }

    const recentPatterns = patterns.slice(-this.CONFIG.SEQUENTIAL_PATTERN_THRESHOLD);
    const ids: number[] = [];

    for (const pattern of recentPatterns) {
      const match = pattern.match(this.SUSPICIOUS_PATTERNS.SEQUENTIAL_ID_PATTERN);
      if (match) {
        ids.push(parseInt(match[1], 10));
      }
    }

    // 연속적인 ID 감지 (1, 2, 3, 4... 또는 100, 101, 102...)
    if (ids.length >= 5) {
      let sequential = 0;
      for (let i = 1; i < ids.length; i++) {
        if (ids[i] - ids[i - 1] === 1) {
          sequential++;
        }
      }
      
      if (sequential >= 4) {
        return true;
      }
    }

    return false;
  }

  /**
   * 페이지네이션 스크래핑 감지
   */
  private detectPaginationScraping(patterns: string[], currentUrl: string): boolean {
    if (!this.SUSPICIOUS_PATTERNS.PAGINATION_PATTERN.test(currentUrl)) {
      return false;
    }

    // 최근 10개 요청 중 페이지네이션 패턴 비율
    const recentPatterns = patterns.slice(-10);
    const paginationCount = recentPatterns.filter(
      p => this.SUSPICIOUS_PATTERNS.PAGINATION_PATTERN.test(p)
    ).length;

    return paginationCount >= 8;  // 80% 이상이면 스크래핑 의심
  }

  /**
   * 빠른 요청 감지
   */
  private detectRapidRequests(tracker: RequestTracker): boolean {
    // 1초에 10회 이상
    const elapsed = tracker.lastRequest - tracker.firstRequest;
    if (elapsed < 1000 && tracker.count >= 10) {
      return true;
    }
    
    // 10초에 50회 이상
    if (elapsed < 10000 && tracker.count >= 50) {
      return true;
    }

    return false;
  }

  /**
   * 속도 제한 확인
   */
  private isRateLimitExceeded(ip: string, userId?: string): boolean {
    const ipTracker = this.ipTrackers.get(ip);
    if (ipTracker) {
      if (ipTracker.count > this.CONFIG.MAX_REQUESTS_PER_IP) {
        return true;
      }
      if (ipTracker.endpoints.size > this.CONFIG.MAX_UNIQUE_ENDPOINTS_PER_IP) {
        return true;
      }
    }

    if (userId) {
      const userTracker = this.userTrackers.get(userId);
      if (userTracker) {
        if (userTracker.count > this.CONFIG.MAX_REQUESTS_PER_USER) {
          return true;
        }
        if (userTracker.endpoints.size > this.CONFIG.MAX_UNIQUE_ENDPOINTS_PER_USER) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * 의심 점수 증가
   */
  private incrementSuspiciousScore(
    ip: string,
    userId: string | undefined,
    score: number,
    reason: string,
  ): void {
    const ipTracker = this.ipTrackers.get(ip);
    if (ipTracker) {
      ipTracker.suspiciousScore += score;
      this.logger.warn(`Suspicious activity [IP: ${ip}]: ${reason} (score: ${ipTracker.suspiciousScore})`);
    }

    if (userId) {
      const userTracker = this.userTrackers.get(userId);
      if (userTracker) {
        userTracker.suspiciousScore += score;
        this.logger.warn(`Suspicious activity [User: ${userId}]: ${reason} (score: ${userTracker.suspiciousScore})`);
      }
    }
  }

  /**
   * 스크래핑 감지 처리
   */
  private handleScrapingDetected(ip: string, userId: string | undefined, reason: string): void {
    this.logger.error(`Scraping detected [IP: ${ip}, User: ${userId}]: ${reason}`);
    
    // IP 차단 (30분)
    this.blockedIps.set(ip, {
      blockedAt: Date.now(),
      reason,
      duration: this.CONFIG.BLOCK_DURATION_MEDIUM,
    });

    // User 차단 (30분)
    if (userId) {
      this.blockedUsers.set(userId, {
        blockedAt: Date.now(),
        reason,
        duration: this.CONFIG.BLOCK_DURATION_MEDIUM,
      });
    }
  }

  /**
   * 속도 제한 초과 처리
   */
  private handleRateLimitExceeded(ip: string, userId: string | undefined): void {
    this.logger.warn(`Rate limit exceeded [IP: ${ip}, User: ${userId}]`);
    
    // IP 차단 (5분)
    this.blockedIps.set(ip, {
      blockedAt: Date.now(),
      reason: 'Rate limit exceeded',
      duration: this.CONFIG.BLOCK_DURATION_SHORT,
    });
  }

  /**
   * 오래된 데이터 정리
   */
  private cleanup(): void {
    const now = Date.now();
    const windowStart = now - this.CONFIG.TIME_WINDOW;

    // 오래된 추적 데이터 정리
    for (const [key, tracker] of this.ipTrackers.entries()) {
      if (tracker.lastRequest < windowStart) {
        this.ipTrackers.delete(key);
      }
    }

    for (const [key, tracker] of this.userTrackers.entries()) {
      if (tracker.lastRequest < windowStart) {
        this.userTrackers.delete(key);
      }
    }

    // 만료된 차단 해제
    for (const [key, block] of this.blockedIps.entries()) {
      if (now >= block.blockedAt + block.duration) {
        this.blockedIps.delete(key);
      }
    }

    for (const [key, block] of this.blockedUsers.entries()) {
      if (now >= block.blockedAt + block.duration) {
        this.blockedUsers.delete(key);
      }
    }

    this.logger.debug(`Cleanup: ${this.ipTrackers.size} IPs, ${this.userTrackers.size} Users tracked`);
  }
}
