// src/blog/services/product-cache.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ProductLinkParserService } from './product-link-parser.service';

interface CachedProductInfo {
  name: string;
  image: string | null;
  price: number | null;
  updatedAt: Date;
}

/**
 * 상품 정보 캐싱 서비스
 * - 파트너스 상품 정보를 DB에 캐싱
 * - 6-12시간마다 가격/재고 정보 갱신
 * - API 호출 횟수 최소화
 * 
 * 사용법: 
 * - Cron job 또는 수동으로 refreshStaleProducts() 호출
 * - 예: node -e "..." 또는 별도 스케줄러에서 API 호출
 */
@Injectable()
export class ProductCacheService {
  private readonly logger = new Logger(ProductCacheService.name);
  
  // 캐시 유효 시간 (6시간)
  private readonly CACHE_TTL_MS = 6 * 60 * 60 * 1000;

  constructor(
    private readonly prisma: PrismaService,
    private readonly productLinkParser: ProductLinkParserService,
  ) {}

  /**
   * 캐시된 상품 정보 조회
   * - 캐시 만료 시 새로 가져오기
   */
  async getCachedProduct(
    productId: string,
    source: string,
  ): Promise<CachedProductInfo | null> {
    const product = await this.prisma.postProduct.findFirst({
      where: { productId, source },
      orderBy: { updatedAt: 'desc' },
    });

    if (!product) return null;

    // 캐시 유효성 확인
    const cacheAge = Date.now() - product.updatedAt.getTime();
    const isStale = cacheAge > this.CACHE_TTL_MS;

    return {
      name: product.name,
      image: product.image,
      price: product.price,
      updatedAt: product.updatedAt,
    };
  }

  /**
   * 상품 정보 갱신 (배치)
   * 외부 스케줄러나 Cron에서 호출
   */
  async refreshStaleProducts(): Promise<void> {
    this.logger.log('Starting product cache refresh...');

    try {
      // 6시간 이상 된 상품들 조회
      const staleDate = new Date(Date.now() - this.CACHE_TTL_MS);
      
      const staleProducts = await this.prisma.postProduct.findMany({
        where: {
          updatedAt: { lt: staleDate },
          source: { in: ['coupang', 'naver'] }, // 외부 상품만
        },
        distinct: ['productId', 'source'],
        take: 100, // 배치 크기 제한
      });

      this.logger.log(`Found ${staleProducts.length} stale products to refresh`);

      // 상품 정보 갱신
      for (const product of staleProducts) {
        try {
          await this.refreshSingleProduct(product.productId, product.source, product.originalUrl);
          
          // Rate limit 방지 (1초 대기)
          await this.sleep(1000);
        } catch (error) {
          this.logger.warn(`Failed to refresh product ${product.productId}`, error);
        }
      }

      this.logger.log('Product cache refresh completed');
    } catch (error) {
      this.logger.error('Product cache refresh failed', error);
    }
  }

  /**
   * 단일 상품 정보 갱신
   */
  private async refreshSingleProduct(
    productId: string,
    source: string,
    originalUrl: string,
  ): Promise<void> {
    // URL에서 새 정보 파싱
    const products = await this.productLinkParser.extractProducts(originalUrl);
    const freshInfo = products.find(
      p => p.productId === productId && p.source === source
    );

    if (!freshInfo) return;

    // DB 업데이트
    await this.prisma.postProduct.updateMany({
      where: { productId, source },
      data: {
        name: freshInfo.name,
        image: freshInfo.image,
        price: freshInfo.price,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * 수동 캐시 무효화
   */
  async invalidateCache(productId: string, source: string): Promise<void> {
    await this.prisma.postProduct.updateMany({
      where: { productId, source },
      data: {
        updatedAt: new Date(0), // 1970년으로 설정하여 즉시 만료
      },
    });
  }

  /**
   * 캐시 통계
   */
  async getCacheStats(): Promise<{
    totalProducts: number;
    staleProducts: number;
    freshProducts: number;
  }> {
    const staleDate = new Date(Date.now() - this.CACHE_TTL_MS);
    
    const [total, stale] = await Promise.all([
      this.prisma.postProduct.count({
        where: { source: { in: ['coupang', 'naver'] } },
      }),
      this.prisma.postProduct.count({
        where: {
          source: { in: ['coupang', 'naver'] },
          updatedAt: { lt: staleDate },
        },
      }),
    ]);

    return {
      totalProducts: total,
      staleProducts: stale,
      freshProducts: total - stale,
    };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
