// src/blog/product-click.controller.ts
import {
  Controller,
  Get,
  Param,
  Res,
  Req,
  ParseUUIDPipe,
  HttpStatus,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { Throttle } from '@nestjs/throttler';
import { AffiliateService } from './services/affiliate.service';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';

/**
 * 상품 클릭 프록시 컨트롤러
 * 
 * 목적:
 * 1. 데이터 마이닝 방지 - 파트너스 URL을 직접 노출하지 않음
 * 2. 클릭 추적 - 분석용 데이터 수집
 * 3. 보안 - 악성 URL 필터링
 */
@Controller('blog/products')
export class ProductClickController {
  private readonly logger = new Logger(ProductClickController.name);

  constructor(private readonly affiliateService: AffiliateService) {}

  /**
   * 상품 클릭 리다이렉트
   * GET /v1/blog/products/:id/click
   * 
   * 클라이언트에서 상품 카드 클릭 시 이 엔드포인트로 요청
   * → 서버에서 파트너스 URL로 302 리다이렉트
   */
  @Get(':id/click')
  @UseGuards(OptionalJwtAuthGuard)
  @Throttle({ default: { ttl: 1000, limit: 5 } }) // 초당 5회 제한
  async handleClick(
    @Param('id', ParseUUIDPipe) productId: string,
    @Req() req: Request & { user?: { id: string } },
    @Res() res: Response,
  ) {
    try {
      // 클릭 이벤트 처리 및 파트너스 URL 획득
      const affiliateUrl = await this.affiliateService.handleProductClick({
        postProductId: productId,
        userId: req.user?.id,
        userAgent: req.headers['user-agent'],
        ip: this.getClientIp(req),
        referer: req.headers.referer,
      });

      // 302 리다이렉트
      return res.redirect(HttpStatus.FOUND, affiliateUrl);
    } catch (error) {
      this.logger.error(`Product click error: ${productId}`, error);
      
      // 에러 시 홈으로 리다이렉트
      return res.redirect(HttpStatus.FOUND, '/');
    }
  }

  /**
   * 클라이언트 IP 추출
   * (프록시/로드밸런서 뒤에 있을 때 X-Forwarded-For 사용)
   */
  private getClientIp(req: Request): string | undefined {
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
      const ips = Array.isArray(forwarded) 
        ? forwarded[0] 
        : forwarded.split(',')[0];
      return ips.trim();
    }
    return req.socket.remoteAddress;
  }
}
