// src/adsense/adsense.service.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface AdSlot {
  id: string;
  position: AdPosition;
  format: AdFormat;
  enabled: boolean;
}

export enum AdPosition {
  HEADER = 'header',           // 글 상단 배너
  FOOTER = 'footer',           // 글 하단 배너
  FEED_TOP = 'feed_top',       // 홈 피드 상단
  FEED_MIDDLE = 'feed_middle', // 홈 피드 중간
  CART_SIDE = 'cart_side',     // 장바구니 사이드
  CART_BOTTOM = 'cart_bottom', // 장바구니 하단
}

export enum AdFormat {
  BANNER = 'banner',           // 배너형
  RECTANGLE = 'rectangle',     // 사각형
  RESPONSIVE = 'responsive',   // 반응형
  IN_FEED = 'in_feed',         // 피드 내 광고
}

@Injectable()
export class AdsenseService {
  private readonly publisherId: string;
  private readonly adSlots: Map<AdPosition, AdSlot>;

  constructor(private readonly configService: ConfigService) {
    this.publisherId = this.configService.get<string>('ADSENSE_PUBLISHER_ID') || '';
    this.adSlots = this.initializeAdSlots();
  }

  /**
   * 광고 슬롯 초기화
   */
  private initializeAdSlots(): Map<AdPosition, AdSlot> {
    const slots = new Map<AdPosition, AdSlot>();

    // 헤더 배너 (글 상단)
    slots.set(AdPosition.HEADER, {
      id: this.configService.get('ADSENSE_SLOT_HEADER') || '',
      position: AdPosition.HEADER,
      format: AdFormat.RESPONSIVE,
      enabled: true,
    });

    // 푸터 배너 (글 하단)
    slots.set(AdPosition.FOOTER, {
      id: this.configService.get('ADSENSE_SLOT_FOOTER') || '',
      position: AdPosition.FOOTER,
      format: AdFormat.RESPONSIVE,
      enabled: true,
    });

    // 홈 피드 상단
    slots.set(AdPosition.FEED_TOP, {
      id: this.configService.get('ADSENSE_SLOT_FEED_TOP') || '',
      position: AdPosition.FEED_TOP,
      format: AdFormat.IN_FEED,
      enabled: true,
    });

    // 홈 피드 중간
    slots.set(AdPosition.FEED_MIDDLE, {
      id: this.configService.get('ADSENSE_SLOT_FEED_MIDDLE') || '',
      position: AdPosition.FEED_MIDDLE,
      format: AdFormat.IN_FEED,
      enabled: true,
    });

    // 장바구니 사이드
    slots.set(AdPosition.CART_SIDE, {
      id: this.configService.get('ADSENSE_SLOT_CART_SIDE') || '',
      position: AdPosition.CART_SIDE,
      format: AdFormat.RECTANGLE,
      enabled: true,
    });

    // 장바구니 하단
    slots.set(AdPosition.CART_BOTTOM, {
      id: this.configService.get('ADSENSE_SLOT_CART_BOTTOM') || '',
      position: AdPosition.CART_BOTTOM,
      format: AdFormat.RESPONSIVE,
      enabled: true,
    });

    return slots;
  }

  /**
   * 광고 슬롯 조회
   */
  getAdSlot(position: AdPosition): AdSlot | null {
    const slot = this.adSlots.get(position);
    if (!slot || !slot.enabled || !slot.id) {
      return null;
    }
    return slot;
  }

  /**
   * 모든 광고 슬롯 조회
   */
  getAllAdSlots(): AdSlot[] {
    return Array.from(this.adSlots.values()).filter(
      slot => slot.enabled && slot.id
    );
  }

  /**
   * 광고 코드 생성 (프론트엔드용)
   */
  generateAdCode(position: AdPosition): string | null {
    const slot = this.getAdSlot(position);
    if (!slot) return null;

    return JSON.stringify({
      publisherId: this.publisherId,
      slotId: slot.id,
      format: slot.format,
      position: slot.position,
    });
  }

  /**
   * 페이지별 광고 슬롯 조회
   */
  getAdsForPage(page: 'home' | 'post' | 'cart'): AdSlot[] {
    const positionsByPage: Record<string, AdPosition[]> = {
      home: [AdPosition.FEED_TOP, AdPosition.FEED_MIDDLE],
      post: [AdPosition.HEADER, AdPosition.FOOTER],
      cart: [AdPosition.CART_SIDE, AdPosition.CART_BOTTOM],
    };

    const positions = positionsByPage[page] || [];
    return positions
      .map(pos => this.getAdSlot(pos))
      .filter((slot): slot is AdSlot => slot !== null);
  }
}
