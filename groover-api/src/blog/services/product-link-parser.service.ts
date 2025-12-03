// src/blog/services/product-link-parser.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

export interface ExtractedProduct {
  productId: string;
  source: 'coupang' | 'naver' | 'internal';
  name: string;
  image: string | null;
  price: number | null;
  originalUrl: string;
  affiliateUrl: string;
}

@Injectable()
export class ProductLinkParserService {
  private readonly logger = new Logger(ProductLinkParserService.name);
  
  private readonly coupangPartnerId: string;
  private readonly naverPartnerId: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.coupangPartnerId = this.configService.get('COUPANG_PARTNERS_ID') || '';
    this.naverPartnerId = this.configService.get('NAVER_PARTNERS_ID') || '';
  }

  /**
   * 본문에서 상품 링크 추출 및 정보 수집
   */
  async extractProducts(content: string): Promise<ExtractedProduct[]> {
    const products: ExtractedProduct[] = [];
    
    const urlRegex = /https?:\/\/[^\s<>"']+/gi;
    const urls = content.match(urlRegex) || [];
    
    for (const url of urls) {
      try {
        const product = await this.parseUrl(url);
        if (product) {
          const exists = products.some(
            p => p.productId === product.productId && p.source === product.source
          );
          if (!exists) {
            products.push(product);
          }
        }
      } catch (error) {
        this.logger.warn(`Failed to parse URL: ${url}`, error);
      }
    }
    
    return products.slice(0, 5);
  }

  private async parseUrl(url: string): Promise<ExtractedProduct | null> {
    if (this.isCoupangUrl(url)) {
      return this.parseCoupangUrl(url);
    }
    
    if (this.isNaverUrl(url)) {
      return this.parseNaverUrl(url);
    }
    
    if (this.isInternalUrl(url)) {
      return this.parseInternalUrl(url);
    }
    
    return null;
  }

  // ========================================
  // 쿠팡 파트너스
  // ========================================

  private isCoupangUrl(url: string): boolean {
    return /coupang\.com|coupa\.ng/i.test(url);
  }

  private async parseCoupangUrl(url: string): Promise<ExtractedProduct | null> {
    try {
      const productId = this.extractCoupangProductId(url);
      if (!productId) return null;

      const affiliateUrl = this.generateCoupangAffiliateUrl(url, productId);
      const productInfo = await this.fetchCoupangProductInfo(productId, url);

      return {
        productId,
        source: 'coupang',
        name: productInfo.name,
        image: productInfo.image,
        price: productInfo.price,
        originalUrl: url,
        affiliateUrl,
      };
    } catch (error) {
      this.logger.error(`Coupang parsing error: ${url}`, error);
      return null;
    }
  }

  private extractCoupangProductId(url: string): string | null {
    const match = url.match(/\/products\/(\d+)/i);
    if (match) return match[1];
    
    const vpMatch = url.match(/\/vp\/products\/(\d+)/i);
    if (vpMatch) return vpMatch[1];
    
    return null;
  }

  private generateCoupangAffiliateUrl(originalUrl: string, productId: string): string {
    if (this.coupangPartnerId) {
      return `https://link.coupang.com/re/AFFSDP?lptag=${this.coupangPartnerId}&pageKey=${productId}&traceid=V0-153-${Date.now()}`;
    }
    return originalUrl;
  }

  private async fetchCoupangProductInfo(productId: string, url: string): Promise<{
    name: string;
    image: string | null;
    price: number | null;
  }> {
    // 실제 구현: Open Graph 메타태그 스크래핑 또는 쿠팡 파트너스 API
    try {
      const response = await firstValueFrom(
        this.httpService.get(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; Groover/1.0)',
          },
          timeout: 3000,
        })
      );
      
      const html = response.data;
      
      // Open Graph 태그 파싱
      const titleMatch = html.match(/<meta\s+property="og:title"\s+content="([^"]+)"/i);
      const imageMatch = html.match(/<meta\s+property="og:image"\s+content="([^"]+)"/i);
      
      return {
        name: titleMatch ? titleMatch[1] : `쿠팡 상품 #${productId}`,
        image: imageMatch ? imageMatch[1] : null,
        price: null, // 가격은 동적이라 정확한 값 얻기 어려움
      };
    } catch (error) {
      return {
        name: `쿠팡 상품 #${productId}`,
        image: null,
        price: null,
      };
    }
  }

  // ========================================
  // 네이버 쇼핑 파트너스
  // ========================================

  private isNaverUrl(url: string): boolean {
    return /smartstore\.naver\.com|shopping\.naver\.com|brand\.naver\.com/i.test(url);
  }

  private async parseNaverUrl(url: string): Promise<ExtractedProduct | null> {
    try {
      const productId = this.extractNaverProductId(url);
      if (!productId) return null;

      const affiliateUrl = this.generateNaverAffiliateUrl(url, productId);
      const productInfo = await this.fetchNaverProductInfo(productId, url);

      return {
        productId,
        source: 'naver',
        name: productInfo.name,
        image: productInfo.image,
        price: productInfo.price,
        originalUrl: url,
        affiliateUrl,
      };
    } catch (error) {
      this.logger.error(`Naver parsing error: ${url}`, error);
      return null;
    }
  }

  private extractNaverProductId(url: string): string | null {
    const productMatch = url.match(/\/products\/(\d+)/i);
    if (productMatch) return `ss_${productMatch[1]}`;
    
    const catalogMatch = url.match(/\/catalog\/(\d+)/i);
    if (catalogMatch) return `cat_${catalogMatch[1]}`;
    
    const nvMidMatch = url.match(/nvMid=(\d+)/i);
    if (nvMidMatch) return `nv_${nvMidMatch[1]}`;
    
    return null;
  }

  private generateNaverAffiliateUrl(originalUrl: string, productId: string): string {
    if (this.naverPartnerId) {
      const encodedUrl = encodeURIComponent(originalUrl);
      return `https://cr.shopping.naver.com/adcr?ref=groover&a_id=${this.naverPartnerId}&url=${encodedUrl}`;
    }
    return originalUrl;
  }

  private async fetchNaverProductInfo(productId: string, url: string): Promise<{
    name: string;
    image: string | null;
    price: number | null;
  }> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; Groover/1.0)',
          },
          timeout: 3000,
        })
      );
      
      const html = response.data;
      
      const titleMatch = html.match(/<meta\s+property="og:title"\s+content="([^"]+)"/i);
      const imageMatch = html.match(/<meta\s+property="og:image"\s+content="([^"]+)"/i);
      
      return {
        name: titleMatch ? titleMatch[1] : `네이버 상품 #${productId}`,
        image: imageMatch ? imageMatch[1] : null,
        price: null,
      };
    } catch (error) {
      return {
        name: `네이버 상품 #${productId}`,
        image: null,
        price: null,
      };
    }
  }

  // ========================================
  // 내부 상품 (Groover)
  // ========================================

  private isInternalUrl(url: string): boolean {
    return /groover\.(com|app|kr)|localhost/i.test(url);
  }

  private async parseInternalUrl(url: string): Promise<ExtractedProduct | null> {
    try {
      const match = url.match(/\/products\/([a-f0-9-]+)/i);
      if (!match) return null;

      const productId = match[1];
      
      return {
        productId,
        source: 'internal',
        name: `Groover 상품 #${productId.slice(0, 8)}`,
        image: null,
        price: null,
        originalUrl: url,
        affiliateUrl: url,
      };
    } catch (error) {
      this.logger.error(`Internal URL parsing error: ${url}`, error);
      return null;
    }
  }
}
