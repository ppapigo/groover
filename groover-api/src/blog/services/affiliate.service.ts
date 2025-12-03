// src/blog/services/affiliate.service.ts
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

interface ClickEvent {
  postProductId: string;
  userId?: string;
  userAgent?: string;
  ip?: string;
  referer?: string;
}

@Injectable()
export class AffiliateService {
  private readonly logger = new Logger(AffiliateService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 상품 클릭 처리 및 파트너스 URL 반환
   */
  async handleProductClick(event: ClickEvent): Promise<string> {
    const product = await this.prisma.postProduct.findUnique({
      where: { id: event.postProductId },
      include: {
        post: {
          select: { id: true, userId: true },
        },
      },
    });

    if (!product) {
      throw new NotFoundException('상품을 찾을 수 없습니다.');
    }

    // 클릭 로그 (비동기 - 성능 영향 최소화)
    this.logClick(event, product).catch(err => 
      this.logger.error('Failed to log click', err)
    );

    // 파트너스 URL 반환
    return product.affiliateUrl || product.originalUrl;
  }

  /**
   * 클릭 로그 저장 (분석용)
   * 실제로는 별도 클릭 로그 테이블이나 분석 시스템에 저장
   */
  private async logClick(event: ClickEvent, product: any): Promise<void> {
    // 프로덕션에서는 별도 analytics 테이블이나 외부 서비스 사용
    this.logger.log({
      type: 'affiliate_click',
      postProductId: event.postProductId,
      postId: product.postId,
      source: product.source,
      userId: event.userId,
      timestamp: new Date().toISOString(),
      userAgent: event.userAgent?.substring(0, 200),
      ip: this.anonymizeIp(event.ip),
    });
  }

  /**
   * IP 익명화 (개인정보 보호)
   */
  private anonymizeIp(ip?: string): string | undefined {
    if (!ip) return undefined;
    
    // IPv4: 마지막 옥텟 제거
    if (ip.includes('.')) {
      const parts = ip.split('.');
      parts[3] = '0';
      return parts.join('.');
    }
    
    // IPv6: 마지막 4개 그룹 제거
    if (ip.includes(':')) {
      const parts = ip.split(':');
      return parts.slice(0, 4).join(':') + '::';
    }
    
    return ip;
  }

  /**
   * 특정 포스트의 클릭 통계 (작성자 대시보드용)
   */
  async getPostClickStats(postId: string, userId: string) {
    // 본인 글만 조회 가능
    const post = await this.prisma.post.findFirst({
      where: { id: postId, userId },
    });

    if (!post) {
      throw new NotFoundException('글을 찾을 수 없습니다.');
    }

    // 실제로는 클릭 로그 테이블에서 집계
    // 여기서는 예시 데이터
    return {
      totalClicks: 0,
      byProduct: [],
      byDate: [],
    };
  }
}
