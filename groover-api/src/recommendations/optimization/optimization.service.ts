// src/recommendations/optimization/optimization.service.ts
import { Injectable } from '@nestjs/common';
import { ScoredProduct } from '../scoring/scoring.service';

/**
 * 카테고리별 예산 할당
 */
export interface CategoryBudget {
  category: string;
  allocatedBudget: number;
  priority: number;
  maxItems?: number;
}

/**
 * 최적화된 장바구니 아이템
 */
export interface OptimizedItem {
  productId: string;
  product: any;
  quantity: number;
  price: number;
  score: number;
  category: string;
}

/**
 * 최적화 결과
 */
export interface OptimizationResult {
  items: OptimizedItem[];
  totalPrice: number;
  totalScore: number;
  budgetUsage: number; // 예산 사용률 (%)
  categoryBreakdown: Array<{
    category: string;
    allocatedBudget: number;
    actualSpent: number;
    itemCount: number;
  }>;
}

@Injectable()
export class OptimizationService {
  /**
   * 예산 내 최적 상품 조합 찾기
   * Greedy + 가성비 기반 알고리즘 (AI 미사용)
   */
  optimize(
    scoredProductsByCategory: Map<string, ScoredProduct[]>,
    categoryBudgets: CategoryBudget[],
    totalBudget: number,
  ): OptimizationResult {
    const items: OptimizedItem[] = [];
    const categoryBreakdown: OptimizationResult['categoryBreakdown'] = [];
    let remainingBudget = totalBudget;

    // 우선순위 순으로 카테고리 정렬
    const sortedCategories = [...categoryBudgets].sort(
      (a, b) => a.priority - b.priority,
    );

    for (const catBudget of sortedCategories) {
      const products = scoredProductsByCategory.get(catBudget.category) || [];
      
      if (products.length === 0) {
        categoryBreakdown.push({
          category: catBudget.category,
          allocatedBudget: catBudget.allocatedBudget,
          actualSpent: 0,
          itemCount: 0,
        });
        continue;
      }

      // 해당 카테고리 예산 (남은 전체 예산 고려)
      const categoryBudget = Math.min(catBudget.allocatedBudget, remainingBudget);
      const maxItems = catBudget.maxItems || 5;

      // 가성비(score/price) 기준 정렬
      const sortedByValue = [...products].sort((a, b) => {
        const valueA = a.totalScore / Math.max(a.product.price, 1);
        const valueB = b.totalScore / Math.max(b.product.price, 1);
        return valueB - valueA;
      });

      // Greedy 선택
      const selectedItems = this.greedySelect(
        sortedByValue,
        categoryBudget,
        maxItems,
      );

      // 결과에 추가
      const categorySpent = selectedItems.reduce((sum, item) => sum + item.price, 0);
      
      items.push(...selectedItems.map((item) => ({
        ...item,
        category: catBudget.category,
      })));

      remainingBudget -= categorySpent;

      categoryBreakdown.push({
        category: catBudget.category,
        allocatedBudget: catBudget.allocatedBudget,
        actualSpent: categorySpent,
        itemCount: selectedItems.length,
      });
    }

    const totalPrice = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const totalScore = items.reduce((sum, item) => sum + item.score, 0) / Math.max(items.length, 1);

    return {
      items,
      totalPrice,
      totalScore,
      budgetUsage: (totalPrice / totalBudget) * 100,
      categoryBreakdown,
    };
  }

  /**
   * Greedy 알고리즘으로 최적 상품 선택
   */
  private greedySelect(
    sortedProducts: ScoredProduct[],
    budget: number,
    maxItems: number,
  ): Omit<OptimizedItem, 'category'>[] {
    const selected: Omit<OptimizedItem, 'category'>[] = [];
    let remainingBudget = budget;

    for (const scored of sortedProducts) {
      if (selected.length >= maxItems) break;
      if (scored.product.price > remainingBudget) continue;

      // 최소 점수 기준 (너무 낮은 점수는 제외)
      if (scored.totalScore < 40) continue;

      selected.push({
        productId: scored.productId,
        product: scored.product,
        quantity: 1,
        price: scored.product.price,
        score: scored.totalScore,
      });

      remainingBudget -= scored.product.price;
    }

    return selected;
  }

  /**
   * 대체 상품 찾기
   */
  findAlternatives(
    currentProduct: any,
    allProducts: ScoredProduct[],
    maxAlternatives: number = 3,
  ): ScoredProduct[] {
    const currentPrice = currentProduct.price;
    const priceRange = currentPrice * 0.3; // ±30% 가격대

    return allProducts
      .filter((p) => {
        // 같은 상품 제외
        if (p.productId === currentProduct.id) return false;
        
        // 가격대 필터
        const priceDiff = Math.abs(p.product.price - currentPrice);
        if (priceDiff > priceRange) return false;

        return true;
      })
      .slice(0, maxAlternatives);
  }

  /**
   * 예산 분배 계산
   */
  calculateBudgetAllocation(
    totalBudget: number,
    categories: Array<{ category: string; ratio: number; priority: number }>,
  ): CategoryBudget[] {
    // 비율 합계 정규화
    const totalRatio = categories.reduce((sum, c) => sum + c.ratio, 0);

    return categories.map((cat) => ({
      category: cat.category,
      allocatedBudget: Math.floor((cat.ratio / totalRatio) * totalBudget),
      priority: cat.priority,
      maxItems: 5,
    }));
  }
}
