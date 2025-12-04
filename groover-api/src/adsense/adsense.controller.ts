// src/adsense/adsense.controller.ts
import {
  Controller,
  Get,
  Query,
} from '@nestjs/common';
import { AdsenseService, AdPosition } from './adsense.service';

@Controller('adsense')
export class AdsenseController {
  constructor(private readonly adsenseService: AdsenseService) {}

  /**
   * 페이지별 광고 슬롯 조회
   * GET /v1/adsense/slots?page=home
   */
  @Get('slots')
  getAdSlots(@Query('page') page: 'home' | 'post' | 'cart' = 'home') {
    const slots = this.adsenseService.getAdsForPage(page);
    return {
      success: true,
      data: slots,
    };
  }

  /**
   * 특정 위치 광고 코드
   * GET /v1/adsense/code?position=header
   */
  @Get('code')
  getAdCode(@Query('position') position: string) {
    const adPosition = position as AdPosition;
    const code = this.adsenseService.generateAdCode(adPosition);
    
    return {
      success: true,
      data: code ? JSON.parse(code) : null,
    };
  }
}
