// src/common/services/fingerprint.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { Request } from 'express';
import * as crypto from 'crypto';

/**
 * 클라이언트 핑거프린트 정보
 */
export interface ClientFingerprint {
  hash: string;
  ip: string;
  userAgent: string;
  acceptLanguage: string;
  acceptEncoding: string;
  connection: string;
  screenResolution?: string;
  timezone?: string;
  plugins?: string;
  canvas?: string;
  webgl?: string;
}

/**
 * 클라이언트 핑거프린트 서비스
 * 
 * 기능:
 * 1. HTTP 헤더 기반 핑거프린트 생성
 * 2. 디바이스 식별
 * 3. 봇 탐지 보조
 * 4. 세션 하이재킹 탐지
 */
@Injectable()
export class FingerprintService {
  private readonly logger = new Logger(FingerprintService.name);

  /**
   * HTTP 요청에서 핑거프린트 생성
   */
  generateFingerprint(request: Request): ClientFingerprint {
    const ip = this.getClientIp(request);
    const userAgent = request.headers['user-agent'] || '';
    const acceptLanguage = request.headers['accept-language'] || '';
    const acceptEncoding = request.headers['accept-encoding'] || '';
    const connection = request.headers['connection'] || '';
    
    // 클라이언트에서 전송한 추가 정보 (선택적)
    const screenResolution = request.headers['x-screen-resolution'] as string;
    const timezone = request.headers['x-timezone'] as string;

    // 핑거프린트 해시 생성
    const hash = this.createHash({
      ip,
      userAgent,
      acceptLanguage,
      acceptEncoding,
      connection,
      screenResolution,
      timezone,
    });

    return {
      hash,
      ip,
      userAgent,
      acceptLanguage,
      acceptEncoding,
      connection,
      screenResolution,
      timezone,
    };
  }

  /**
   * 두 핑거프린트 비교 (유사도)
   */
  compareFingerprints(fp1: ClientFingerprint, fp2: ClientFingerprint): number {
    let score = 0;
    let total = 0;

    // IP 비교 (부분 일치)
    total += 30;
    if (fp1.ip === fp2.ip) {
      score += 30;
    } else if (this.isSameSubnet(fp1.ip, fp2.ip)) {
      score += 15;  // 같은 서브넷이면 부분 점수
    }

    // User-Agent 비교
    total += 25;
    if (fp1.userAgent === fp2.userAgent) {
      score += 25;
    } else if (this.isSimilarUserAgent(fp1.userAgent, fp2.userAgent)) {
      score += 10;
    }

    // Accept-Language 비교
    total += 15;
    if (fp1.acceptLanguage === fp2.acceptLanguage) {
      score += 15;
    }

    // Accept-Encoding 비교
    total += 10;
    if (fp1.acceptEncoding === fp2.acceptEncoding) {
      score += 10;
    }

    // Screen Resolution 비교
    if (fp1.screenResolution && fp2.screenResolution) {
      total += 10;
      if (fp1.screenResolution === fp2.screenResolution) {
        score += 10;
      }
    }

    // Timezone 비교
    if (fp1.timezone && fp2.timezone) {
      total += 10;
      if (fp1.timezone === fp2.timezone) {
        score += 10;
      }
    }

    return (score / total) * 100;
  }

  /**
   * 핑거프린트 변경 감지 (세션 하이재킹 탐지용)
   */
  detectFingerprintChange(
    original: ClientFingerprint,
    current: ClientFingerprint,
  ): { changed: boolean; severity: 'low' | 'medium' | 'high'; changes: string[] } {
    const changes: string[] = [];
    let severityScore = 0;

    // IP 변경 (높은 위험)
    if (original.ip !== current.ip) {
      changes.push('IP');
      if (!this.isSameSubnet(original.ip, current.ip)) {
        severityScore += 50;  // 다른 서브넷이면 높은 점수
      } else {
        severityScore += 20;
      }
    }

    // User-Agent 변경 (높은 위험)
    if (original.userAgent !== current.userAgent) {
      changes.push('User-Agent');
      severityScore += 40;
    }

    // Accept-Language 변경 (중간 위험)
    if (original.acceptLanguage !== current.acceptLanguage) {
      changes.push('Accept-Language');
      severityScore += 15;
    }

    // Timezone 변경 (중간 위험)
    if (original.timezone && current.timezone && original.timezone !== current.timezone) {
      changes.push('Timezone');
      severityScore += 20;
    }

    // Screen Resolution 변경 (낮은 위험)
    if (original.screenResolution && current.screenResolution && 
        original.screenResolution !== current.screenResolution) {
      changes.push('Screen Resolution');
      severityScore += 10;
    }

    let severity: 'low' | 'medium' | 'high' = 'low';
    if (severityScore >= 50) {
      severity = 'high';
    } else if (severityScore >= 25) {
      severity = 'medium';
    }

    return {
      changed: changes.length > 0,
      severity,
      changes,
    };
  }

  /**
   * 봇 탐지 점수 계산
   */
  calculateBotScore(fingerprint: ClientFingerprint): number {
    let score = 0;

    // User-Agent 검사
    if (!fingerprint.userAgent || fingerprint.userAgent.length < 20) {
      score += 30;
    }
    
    if (this.isKnownBot(fingerprint.userAgent)) {
      score += 50;
    }

    // Accept-Language 검사 (봇은 종종 이 헤더가 없음)
    if (!fingerprint.acceptLanguage) {
      score += 15;
    }

    // Accept-Encoding 검사
    if (!fingerprint.acceptEncoding) {
      score += 10;
    }

    // Connection 헤더 검사
    if (!fingerprint.connection) {
      score += 5;
    }

    // 클라이언트 정보가 전혀 없으면 의심
    if (!fingerprint.screenResolution && !fingerprint.timezone) {
      score += 10;
    }

    return Math.min(100, score);
  }

  /**
   * 해시 생성
   */
  private createHash(data: Record<string, string | undefined>): string {
    const str = Object.entries(data)
      .filter(([_, v]) => v)
      .map(([k, v]) => `${k}:${v}`)
      .sort()
      .join('|');

    return crypto.createHash('sha256').update(str).digest('hex').substring(0, 32);
  }

  /**
   * 클라이언트 IP 추출
   */
  private getClientIp(request: Request): string {
    const forwarded = request.headers['x-forwarded-for'];
    if (forwarded) {
      return (forwarded as string).split(',')[0].trim();
    }
    return request.ip || request.socket.remoteAddress || 'unknown';
  }

  /**
   * 같은 서브넷인지 확인
   */
  private isSameSubnet(ip1: string, ip2: string): boolean {
    const parts1 = ip1.split('.');
    const parts2 = ip2.split('.');
    
    if (parts1.length !== 4 || parts2.length !== 4) {
      return false;
    }

    // /24 서브넷 비교 (처음 3 옥텟)
    return parts1[0] === parts2[0] && 
           parts1[1] === parts2[1] && 
           parts1[2] === parts2[2];
  }

  /**
   * 유사한 User-Agent인지 확인
   */
  private isSimilarUserAgent(ua1: string, ua2: string): boolean {
    // 브라우저/OS 추출
    const extractInfo = (ua: string) => {
      const browser = ua.match(/(Chrome|Firefox|Safari|Edge|Opera|MSIE|Trident)/i)?.[0];
      const os = ua.match(/(Windows|Mac|Linux|Android|iOS|iPhone|iPad)/i)?.[0];
      return { browser, os };
    };

    const info1 = extractInfo(ua1);
    const info2 = extractInfo(ua2);

    return info1.browser === info2.browser && info1.os === info2.os;
  }

  /**
   * 알려진 봇인지 확인
   */
  private isKnownBot(userAgent: string): boolean {
    const botPatterns = [
      /bot/i, /crawler/i, /spider/i, /scraper/i,
      /curl/i, /wget/i, /python/i, /java/i, /perl/i, /ruby/i,
      /phantom/i, /selenium/i, /puppeteer/i, /playwright/i,
      /headless/i, /chrome-lighthouse/i,
    ];

    return botPatterns.some(pattern => pattern.test(userAgent));
  }
}
