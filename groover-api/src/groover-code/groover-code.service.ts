// src/groover-code/groover-code.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as zlib from 'zlib';
import * as crypto from 'crypto';

// Groover Code 스키마
export interface GrooverCartSchema {
  v: number;           // version
  items: GrooverCartItem[];
  meta: {
    ts: number;        // timestamp
    tp: number;        // total price
    cur: string;       // currency
  };
}

export interface GrooverCartItem {
  pid: string;         // product id
  qty: number;         // quantity
  prc: number;         // price at encode
  cat: string;         // category (abbreviated)
}

export interface DecodeResult {
  valid: boolean;
  version?: number;
  cart?: {
    items: DecodedItem[];
    totalAtEncode: number;
    currentTotal: number;
  };
  warnings?: Array<{
    type: string;
    itemId: string;
    diff?: number;
  }>;
  error?: string;
}

export interface DecodedItem {
  productId: string;
  name: string;
  quantity: number;
  priceAtEncode: number;
  currentPrice: number;
  priceChanged: boolean;
  available: boolean;
}

const CODE_PREFIX = 'GRV';
const CURRENT_VERSION = 1;

@Injectable()
export class GrooverCodeService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 장바구니 → Groover Code 인코딩
   */
  async encode(cartId: string, userId: string): Promise<{
    grooverCode: string;
    version: number;
    itemCount: number;
    totalPrice: number;
    expiresAt: Date;
  }> {
    // 장바구니 조회
    const cart = await this.prisma.cart.findUnique({
      where: { id: cartId },
      include: {
        cartItems: {
          include: { product: true },
        },
      },
    });

    if (!cart) {
      throw new NotFoundException('Cart not found');
    }

    if (cart.userId !== userId) {
      throw new BadRequestException('You can only encode your own cart');
    }

    if (cart.cartItems.length === 0) {
      throw new BadRequestException('Cannot encode empty cart');
    }

    // 스키마 생성
    const schema: GrooverCartSchema = {
      v: CURRENT_VERSION,
      items: cart.cartItems.map((item) => ({
        pid: item.productId,
        qty: item.quantity,
        prc: item.priceAtAddition,
        cat: this.abbreviateCategory(item.product.category),
      })),
      meta: {
        ts: Date.now(),
        tp: cart.totalPrice,
        cur: 'KRW',
      },
    };

    // 인코딩: JSON → Deflate 압축 → Base64
    const jsonStr = JSON.stringify(schema);
    const compressed = zlib.deflateSync(jsonStr);
    const base64 = this.toUrlSafeBase64(compressed);

    // 체크섬 생성
    const checksum = this.generateChecksum(base64);

    // 최종 코드: GRV{version}-{base64}{checksum}
    const grooverCode = `${CODE_PREFIX}${CURRENT_VERSION}-${base64}${checksum}`;

    // 30일 후 만료
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    // 로그 저장
    await this.prisma.grooverCodeLog.create({
      data: {
        code: grooverCode,
        version: CURRENT_VERSION,
        encodedData: base64,
        checksum,
        creatorId: userId,
        itemCount: cart.cartItems.length,
        totalPrice: cart.totalPrice,
        expiresAt,
      },
    });

    // 장바구니에 코드 저장
    await this.prisma.cart.update({
      where: { id: cartId },
      data: { grooverCode },
    });

    return {
      grooverCode,
      version: CURRENT_VERSION,
      itemCount: cart.cartItems.length,
      totalPrice: cart.totalPrice,
      expiresAt,
    };
  }

  /**
   * Groover Code → 장바구니 디코딩
   */
  async decode(code: string): Promise<DecodeResult> {
    // 형식 검증
    const parsed = this.parseCode(code);
    if (!parsed) {
      return { valid: false, error: 'INVALID_FORMAT' };
    }

    const { version, payload, checksum } = parsed;

    // 체크섬 검증
    if (!this.verifyChecksum(payload, checksum)) {
      return { valid: false, error: 'CHECKSUM_MISMATCH' };
    }

    try {
      // 디코딩: Base64 → Deflate 해제 → JSON
      const compressed = this.fromUrlSafeBase64(payload);
      const jsonStr = zlib.inflateSync(compressed).toString('utf-8');
      const schema: GrooverCartSchema = JSON.parse(jsonStr);

      // 상품 정보 조회
      const productIds = schema.items.map((item) => item.pid);
      const products = await this.prisma.product.findMany({
        where: { id: { in: productIds } },
      });
      const productMap = new Map(products.map((p) => [p.id, p]));

      // 가격 변동 체크
      const items: DecodedItem[] = schema.items.map((item) => {
        const product = productMap.get(item.pid);
        const currentPrice = product?.price ?? item.prc;
        const priceChanged = currentPrice !== item.prc;

        return {
          productId: item.pid,
          name: product?.name ?? 'Unknown Product',
          quantity: item.qty,
          priceAtEncode: item.prc,
          currentPrice,
          priceChanged,
          available: product?.isActive ?? false,
        };
      });

      const warnings = items
        .filter((item) => item.priceChanged || !item.available)
        .map((item) => ({
          type: !item.available ? 'UNAVAILABLE' : 'PRICE_CHANGED',
          itemId: item.productId,
          ...(item.priceChanged && {
            diff: item.currentPrice - item.priceAtEncode,
          }),
        }));

      // 조회수 증가
      await this.prisma.grooverCodeLog.updateMany({
        where: { code },
        data: { decodeCount: { increment: 1 } },
      });

      return {
        valid: true,
        version,
        cart: {
          items,
          totalAtEncode: schema.meta.tp,
          currentTotal: items.reduce(
            (sum, item) => sum + item.currentPrice * item.quantity,
            0,
          ),
        },
        warnings: warnings.length > 0 ? warnings : undefined,
      };
    } catch (error) {
      return { valid: false, error: 'DECODE_ERROR' };
    }
  }

  /**
   * Groover Code로 새 장바구니 생성
   */
  async saveToCart(
    code: string,
    userId: string,
    cartName?: string,
  ): Promise<any> {
    const decoded = await this.decode(code);

    if (!decoded.valid) {
      throw new BadRequestException(decoded.error);
    }

    // 사용 가능한 상품만 필터링
    const availableItems = decoded.cart.items.filter((item) => item.available);

    if (availableItems.length === 0) {
      throw new BadRequestException('No available products in this code');
    }

    // 새 장바구니 생성
    const cart = await this.prisma.cart.create({
      data: {
        userId,
        name: cartName || `Imported Cart`,
        grooverCode: code,
        totalPrice: availableItems.reduce(
          (sum, item) => sum + item.currentPrice * item.quantity,
          0,
        ),
        itemCount: availableItems.reduce((sum, item) => sum + item.quantity, 0),
        cartItems: {
          create: availableItems.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            priceAtAddition: item.currentPrice,
          })),
        },
      },
      include: {
        cartItems: {
          include: { product: true },
        },
      },
    });

    // 저장 수 증가
    await this.prisma.grooverCodeLog.updateMany({
      where: { code },
      data: { saveCount: { increment: 1 } },
    });

    return cart;
  }

  /**
   * 상품별 쇼핑몰 검색 URL 생성
   */
  generateShoppingLinks(product: {
    name: string;
    brand?: string;
    category?: string;
  }): { coupang: string; naver: string } {
    const searchQuery = this.buildSearchQuery(product);
    const encodedQuery = encodeURIComponent(searchQuery);

    return {
      coupang: `https://www.coupang.com/np/search?component=&q=${encodedQuery}`,
      naver: `https://search.shopping.naver.com/search/all?query=${encodedQuery}`,
    };
  }

  /**
   * 장바구니 전체 상품 링크 생성
   */
  async generateCartLinks(cartId: string): Promise<
    Array<{
      productId: string;
      productName: string;
      links: { coupang: string; naver: string };
    }>
  > {
    const cart = await this.prisma.cart.findUnique({
      where: { id: cartId },
      include: {
        cartItems: {
          include: { product: true },
        },
      },
    });

    if (!cart) {
      throw new NotFoundException('Cart not found');
    }

    return cart.cartItems.map((item) => ({
      productId: item.productId,
      productName: item.product.name,
      links: this.generateShoppingLinks({
        name: item.product.name,
        brand: item.product.brand,
        category: item.product.category,
      }),
    }));
  }

  /**
   * 코드 통계 조회
   */
  async getCodeStats(code: string) {
    const log = await this.prisma.grooverCodeLog.findUnique({
      where: { code },
    });

    if (!log) {
      throw new NotFoundException('Code not found');
    }

    return {
      code: log.code,
      version: log.version,
      itemCount: log.itemCount,
      totalPrice: log.totalPrice,
      decodeCount: log.decodeCount,
      saveCount: log.saveCount,
      createdAt: log.createdAt,
      expiresAt: log.expiresAt,
      isExpired: new Date() > log.expiresAt,
    };
  }

  // ============ Private Helpers ============

  private parseCode(
    code: string,
  ): { version: number; payload: string; checksum: string } | null {
    // GRV1-{payload}{checksum(8자)}
    const regex = /^GRV(\d+)-(.+)(.{8})$/;
    const match = code.match(regex);
    if (!match) return null;

    return {
      version: parseInt(match[1], 10),
      payload: match[2],
      checksum: match[3],
    };
  }

  private generateChecksum(data: string): string {
    return crypto
      .createHash('sha256')
      .update(data)
      .digest('base64url')
      .substring(0, 8);
  }

  private verifyChecksum(payload: string, checksum: string): boolean {
    return this.generateChecksum(payload) === checksum;
  }

  private toUrlSafeBase64(data: Buffer): string {
    return data
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }

  private fromUrlSafeBase64(str: string): Buffer {
    const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
    return Buffer.from(base64, 'base64');
  }

  private abbreviateCategory(category: string): string {
    const map: Record<string, string> = {
      FOOD: 'F',
      HOUSEHOLD: 'H',
      BEAUTY: 'B',
      ELECTRONICS: 'E',
      CLOTHING: 'C',
      HEALTH: 'HE',
      BABY: 'BA',
      PET: 'P',
      OTHER: 'O',
    };
    return map[category] || 'O';
  }

  private buildSearchQuery(product: {
    name: string;
    brand?: string;
  }): string {
    const parts: string[] = [];

    if (product.brand) {
      parts.push(product.brand);
    }

    // 상품명 정리
    const cleanName = product.name
      .replace(/\[.*?\]/g, '')
      .replace(/\(.*?\)/g, '')
      .trim();
    parts.push(cleanName);

    return parts.join(' ');
  }
}
