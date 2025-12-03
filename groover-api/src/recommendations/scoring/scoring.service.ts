// src/recommendations/scoring/scoring.service.ts
import { Injectable } from '@nestjs/common';

/**
 * 스코어링 가중치
 */
interface ScoreWeights {
  price: number;      // 가격 점수 가중치
  quality: number;    // 품질(평점) 점수 가중치
  review: number;     // 리뷰 신뢰도 점수 가중치
  popularity: number; // 인기도 점수 가중치
  discount: number;   // 할인율 점수 가중치
}

/**
 * 상품 스코어링 결과
 */
export interface ScoredProduct {
  productId: string;
  product: any;
  totalScore: number;
  scoreBreakdown: {
    priceScore: number;
    qualityScore: number;
    reviewScore: number;
    popularityScore: number;
    discountScore: number;
  };
}

/**
 * 사용자 선호도
 */
export interface UserPreferences {
  priceStrategy?: 'CHEAPEST' | 'BEST_VALUE' | 'PREMIUM';
  preferredBrands?: string[];
  excludeBrands?: string[];
  minRating?: number;
}

@Injectable()
export class ScoringService {
  // 기본 가중치 (합계 = 1.0)
  private defaultWeights: ScoreWeights = {
    price: 0.25,
    quality: 0.25,
    review: 0.15,
    popularity: 0.15,
    discount: 0.20,
  };

  /**
   * 상품 목록에 점수 부여
   * AI 없이 100% 규칙 기반
   */
  scoreProducts(
    products: any[],
    preferences?: UserPreferences,
    categoryBudget?: number,
  ): ScoredProduct[] {
    // 카테고리 내 가격 통계 계산
    const prices = products.map((p) => p.price);
    const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
    const maxPrice = Math.max(...prices);
    const minPrice = Math.min(...prices);

    // 가중치 조정 (선호도에 따라)
    const weights = this.adjustWeights(preferences);

    return products
      .map((product) => {
        const breakdown = {
          priceScore: this.calculatePriceScore(product, minPrice, maxPrice, avgPrice, preferences),
          qualityScore: this.calculateQualityScore(product, preferences),
          reviewScore: this.calculateReviewScore(product),
          popularityScore: this.calculatePopularityScore(product),
          discountScore: this.calculateDiscountScore(product),
        };

        // 가중 평균 계산
        const totalScore =
          breakdown.priceScore * weights.price +
          breakdown.qualityScore * weights.quality +
          breakdown.reviewScore * weights.review +
          breakdown.popularityScore * weights.popularity +
          breakdown.discountScore * weights.discount;

        // 브랜드 선호도 보정
        const brandBonus = this.calculateBrandBonus(product, preferences);

        return {
          productId: product.id,
          product,
          totalScore: Math.min(100, Math.max(0, totalScore + brandBonus)),
          scoreBreakdown: breakdown,
        };
      })
      .sort((a, b) => b.totalScore - a.totalScore);
  }

  /**
   * 가격 점수 계산 (0-100)
   */
  private calculatePriceScore(
    product: any,
    minPrice: number,
    maxPrice: number,
    avgPrice: number,
    preferences?: UserPreferences,
  ): number {
    const price = product.price;
    const strategy = preferences?.priceStrategy || 'BEST_VALUE';

    // 가격 범위 정규화 (0-100)
    const priceRange = maxPrice - minPrice || 1;
    const normalizedPrice = ((maxPrice - price) / priceRange) * 100;

    switch (strategy) {
      case 'CHEAPEST':
        // 저렴할수록 높은 점수
        return normalizedPrice;

      case 'PREMIUM':
        // 비쌀수록 높은 점수 (품질 기대)
        return 100 - normalizedPrice;

      case 'BEST_VALUE':
      default:
        // 평균 가격 근처가 가장 높은 점수
        const deviation = Math.abs(price - avgPrice) / avgPrice;
        return Math.max(0, 100 - deviation * 100);
    }
  }

  /**
   * 품질(평점) 점수 계산 (0-100)
   */
  private calculateQualityScore(product: any, preferences?: UserPreferences): number {
    const rating = product.rating || 0;
    const minRating = preferences?.minRating || 0;

    // 최소 평점 미달 시 큰 페널티
    if (rating < minRating) {
      return Math.max(0, (rating / 5) * 50);
    }

    // 5점 만점 → 100점 변환
    return (rating / 5) * 100;
  }

  /**
   * 리뷰 신뢰도 점수 계산 (0-100)
   */
  private calculateReviewScore(product: any): number {
    const reviewCount = product.reviewCount || 0;

    if (reviewCount === 0) {
      return 30; // 리뷰 없으면 기본 낮은 점수
    }

    // 로그 스케일 (리뷰 1000개 이상이면 만점 근처)
    const score = Math.min(100, Math.log10(reviewCount + 1) * 33);
    return score;
  }

  /**
   * 인기도 점수 계산 (0-100)
   */
  private calculatePopularityScore(product: any): number {
    // 이미 계산된 인기도 점수가 있으면 사용
    if (product.popularityScore !== undefined && product.popularityScore !== null) {
      return product.popularityScore;
    }

    // 없으면 리뷰 수와 평점 조합으로 추정
    const rating = product.rating || 0;
    const reviewCount = product.reviewCount || 0;

    return Math.min(100, (rating / 5) * 50 + Math.log10(reviewCount + 1) * 16);
  }

  /**
   * 할인율 점수 계산 (0-100)
   */
  private calculateDiscountScore(product: any): number {
    const price = product.price;
    const originalPrice = product.originalPrice;

    if (!originalPrice || originalPrice <= price) {
      return 50; // 할인 없으면 중간 점수
    }

    const discountRate = (originalPrice - price) / originalPrice;
    
    // 할인율 30% 이상이면 만점
    return Math.min(100, discountRate * 333);
  }

  /**
   * 브랜드 선호도 보정
   */
  private calculateBrandBonus(product: any, preferences?: UserPreferences): number {
    if (!preferences) return 0;

    const brand = product.brand?.toLowerCase();
    if (!brand) return 0;

    // 선호 브랜드 보너스
    if (preferences.preferredBrands?.some((b) => b.toLowerCase() === brand)) {
      return 15;
    }

    // 제외 브랜드 페널티
    if (preferences.excludeBrands?.some((b) => b.toLowerCase() === brand)) {
      return -50;
    }

    return 0;
  }

  /**
   * 선호도에 따른 가중치 조정
   */
  private adjustWeights(preferences?: UserPreferences): ScoreWeights {
    if (!preferences?.priceStrategy) {
      return this.defaultWeights;
    }

    switch (preferences.priceStrategy) {
      case 'CHEAPEST':
        return {
          price: 0.40,
          quality: 0.15,
          review: 0.15,
          popularity: 0.10,
          discount: 0.20,
        };

      case 'PREMIUM':
        return {
          price: 0.10,
          quality: 0.35,
          review: 0.20,
          popularity: 0.20,
          discount: 0.15,
        };

      case 'BEST_VALUE':
      default:
        return this.defaultWeights;
    }
  }

  /**
   * 템플릿 기반 추천 설명 생성 (AI 미사용)
   */
  generateExplanation(
    scoredProducts: ScoredProduct[],
    totalBudget: number,
    actualSpent: number,
  ): string {
    const itemCount = scoredProducts.length;
    const saved = totalBudget - actualSpent;
    const savingsPercent = ((saved / totalBudget) * 100).toFixed(1);

    // 최고 점수 상품
    const topProduct = scoredProducts[0];
    const avgScore = scoredProducts.reduce((sum, p) => sum + p.totalScore, 0) / itemCount;

    let explanation = `예산 ${totalBudget.toLocaleString()}원 중 ${actualSpent.toLocaleString()}원을 사용하여 `;
    explanation += `총 ${itemCount}개 상품을 추천드립니다. `;
    explanation += `${saved.toLocaleString()}원(${savingsPercent}%)을 절약하셨습니다!\n\n`;

    explanation += `📊 추천 품질 점수: 평균 ${avgScore.toFixed(1)}점\n`;
    explanation += `⭐ 최고 추천: ${topProduct.product.name} (${topProduct.totalScore.toFixed(1)}점)`;

    return explanation;
  }
}
