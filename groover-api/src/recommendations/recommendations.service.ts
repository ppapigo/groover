// src/recommendations/recommendations.service.ts
import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { PrismaService } from '../prisma/prisma.service';
import { ScoringService, UserPreferences, ScoredProduct } from './scoring/scoring.service';
import { OptimizationService, CategoryBudget, OptimizationResult } from './optimization/optimization.service';
import { CreateRecommendationDto } from './dto/create-recommendation.dto';
import * as crypto from 'crypto';

/**
 * 추천 결과
 */
export interface RecommendationResult {
  recommendationId: string;
  grooverCode?: string;
  summary: {
    totalBudget: number;
    totalPrice: number;
    totalItems: number;
    savedAmount: number;
    savingsPercent: number;
    avgScore: number;
  };
  categories: Array<{
    category: string;
    allocatedBudget: number;
    actualSpent: number;
    items: Array<{
      productId: string;
      name: string;
      price: number;
      originalPrice?: number;
      quantity: number;
      score: number;
      scoreBreakdown: any;
      searchLinks: {
        coupang: string;
        naver: string;
      };
      alternatives?: Array<{
        productId: string;
        name: string;
        price: number;
        score: number;
      }>;
    }>;
  }>;
  explanation: string;
  usedAi: boolean;
  processingTimeMs: number;
  createdAt: Date;
}

@Injectable()
export class RecommendationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scoringService: ScoringService,
    private readonly optimizationService: OptimizationService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  /**
   * 추천 생성 (메인 로직)
   * AI 없이 규칙 기반으로 동작
   */
  async createRecommendation(
    userId: string,
    dto: CreateRecommendationDto,
  ): Promise<RecommendationResult> {
    const startTime = Date.now();

    // 1. 캐시 체크
    const cacheKey = this.buildCacheKey(dto);
    const cached = await this.cacheManager.get<RecommendationResult>(cacheKey);
    if (cached) {
      console.log('📦 Cache hit! Returning cached recommendation');
      return cached;
    }

    // 2. 예산 분배 계산
    const categoryBudgets = this.optimizationService.calculateBudgetAllocation(
      dto.totalBudget,
      dto.categories,
    );

    // 3. 카테고리별 상품 후보 수집 & 스코어링
    const scoredProductsByCategory = new Map<string, ScoredProduct[]>();
    const preferences: UserPreferences = {
      priceStrategy: dto.priceStrategy,
      preferredBrands: dto.preferredBrands,
      excludeBrands: dto.excludeBrands,
      minRating: dto.minRating,
    };

    for (const catBudget of categoryBudgets) {
      // 해당 카테고리 상품 조회 (가격 범위 내)
      const products = await this.prisma.product.findMany({
        where: {
          category: catBudget.category,
          price: { lte: catBudget.allocatedBudget },
          isActive: true,
        },
        orderBy: [
          { popularityScore: 'desc' },
          { rating: 'desc' },
        ],
        take: 50, // 카테고리당 최대 50개 후보
      });

      // 스코어링
      const scored = this.scoringService.scoreProducts(
        products,
        preferences,
        catBudget.allocatedBudget,
      );

      scoredProductsByCategory.set(catBudget.category, scored);
    }

    // 4. 최적화 (예산 내 최적 조합)
    const optimizationResult = this.optimizationService.optimize(
      scoredProductsByCategory,
      categoryBudgets,
      dto.totalBudget,
    );

    // 5. 결과 포맷팅
    const result = await this.formatResult(
      userId,
      dto,
      optimizationResult,
      scoredProductsByCategory,
      startTime,
    );

    // 6. DB 저장
    await this.saveRecommendation(userId, dto, result);

    // 7. 캐시 저장
    await this.cacheManager.set(cacheKey, result, 3600000); // 1시간

    return result;
  }

  /**
   * 추천 결과 조회
   */
  async getRecommendation(id: string): Promise<any> {
    const recommendation = await this.prisma.recommendation.findUnique({
      where: { id },
    });

    if (!recommendation) {
      throw new NotFoundException(`Recommendation ${id} not found`);
    }

    return {
      id: recommendation.id,
      status: recommendation.status,
      totalBudget: recommendation.totalBudget,
      totalPrice: recommendation.totalPrice,
      totalItems: recommendation.totalItems,
      savedAmount: recommendation.savedAmount,
      grooverCode: recommendation.grooverCode,
      usedAi: recommendation.usedAi,
      explanation: recommendation.aiExplanation,
      result: recommendation.resultPayload,
      createdAt: recommendation.createdAt,
    };
  }

  /**
   * 사용자 추천 기록 조회
   */
  async getHistory(userId: string, page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;

    const [recommendations, total] = await Promise.all([
      this.prisma.recommendation.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          totalBudget: true,
          totalPrice: true,
          totalItems: true,
          savedAmount: true,
          grooverCode: true,
          status: true,
          createdAt: true,
        },
      }),
      this.prisma.recommendation.count({ where: { userId } }),
    ]);

    return {
      data: recommendations,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * 결과 포맷팅
   */
  private async formatResult(
    userId: string,
    dto: CreateRecommendationDto,
    optimization: OptimizationResult,
    scoredProductsByCategory: Map<string, ScoredProduct[]>,
    startTime: number,
  ): Promise<RecommendationResult> {
    const totalPrice = optimization.totalPrice;
    const savedAmount = dto.totalBudget - totalPrice;

    // 카테고리별 결과 정리
    const categories = optimization.categoryBreakdown.map((cat) => {
      const categoryItems = optimization.items.filter(
        (item) => item.category === cat.category,
      );

      const scoredProducts = scoredProductsByCategory.get(cat.category) || [];

      return {
        category: cat.category,
        allocatedBudget: cat.allocatedBudget,
        actualSpent: cat.actualSpent,
        items: categoryItems.map((item) => {
          const scored = scoredProducts.find((s) => s.productId === item.productId);
          
          // 대체 상품 찾기
          const alternatives = dto.includeAlternatives
            ? this.optimizationService
                .findAlternatives(item.product, scoredProducts, 3)
                .map((alt) => ({
                  productId: alt.productId,
                  name: alt.product.name,
                  price: alt.product.price,
                  score: alt.totalScore,
                }))
            : undefined;

          return {
            productId: item.productId,
            name: item.product.name,
            price: item.price,
            originalPrice: item.product.originalPrice,
            quantity: item.quantity,
            score: item.score,
            scoreBreakdown: scored?.scoreBreakdown,
            searchLinks: this.generateSearchLinks(item.product),
            alternatives,
          };
        }),
      };
    });

    // 설명 생성 (AI 미사용, 템플릿 기반)
    const allScoredProducts = optimization.items.map((item) => {
      const scored = Array.from(scoredProductsByCategory.values())
        .flat()
        .find((s) => s.productId === item.productId);
      return scored!;
    }).filter(Boolean);

    const explanation = this.scoringService.generateExplanation(
      allScoredProducts,
      dto.totalBudget,
      totalPrice,
    );

    return {
      recommendationId: crypto.randomUUID(),
      summary: {
        totalBudget: dto.totalBudget,
        totalPrice,
        totalItems: optimization.items.length,
        savedAmount,
        savingsPercent: (savedAmount / dto.totalBudget) * 100,
        avgScore: optimization.totalScore,
      },
      categories,
      explanation,
      usedAi: false,
      processingTimeMs: Date.now() - startTime,
      createdAt: new Date(),
    };
  }

  /**
   * DB 저장
   */
  private async saveRecommendation(
    userId: string,
    dto: CreateRecommendationDto,
    result: RecommendationResult,
  ) {
    await this.prisma.recommendation.create({
      data: {
        id: result.recommendationId,
        userId,
        totalBudget: dto.totalBudget,
        requestPayload: dto as any,
        resultPayload: result as any,
        status: 'COMPLETED',
        totalPrice: result.summary.totalPrice,
        totalItems: result.summary.totalItems,
        savedAmount: result.summary.savedAmount,
        aiExplanation: result.explanation,
        usedAi: false,
        processingTimeMs: result.processingTimeMs,
      },
    });
  }

  /**
   * 캐시 키 생성
   */
  private buildCacheKey(dto: CreateRecommendationDto): string {
    const keyData = {
      budget: dto.totalBudget,
      categories: dto.categories.map((c) => ({
        cat: c.category,
        ratio: c.ratio,
      })),
      priceStrategy: dto.priceStrategy,
      brands: dto.preferredBrands,
    };

    const hash = crypto
      .createHash('sha256')
      .update(JSON.stringify(keyData))
      .digest('hex')
      .substring(0, 16);

    return `rec:${hash}`;
  }

  /**
   * 쇼핑 검색 링크 생성
   */
  private generateSearchLinks(product: any): { coupang: string; naver: string } {
    const query = product.brand
      ? `${product.brand} ${product.name}`
      : product.name;

    const cleanQuery = query
      .replace(/\[.*?\]/g, '')
      .replace(/\(.*?\)/g, '')
      .trim();

    const encoded = encodeURIComponent(cleanQuery);

    return {
      coupang: `https://www.coupang.com/np/search?q=${encoded}`,
      naver: `https://search.shopping.naver.com/search/all?query=${encoded}`,
    };
  }
}
