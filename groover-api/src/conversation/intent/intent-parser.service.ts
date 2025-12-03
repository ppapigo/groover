// src/conversation/intent/intent-parser.service.ts
import { Injectable } from '@nestjs/common';
import {
  IntentType,
  ParsedIntent,
  CATEGORY_KEYWORDS,
  QUANTITY_KEYWORDS,
  INTENT_KEYWORDS,
} from './intent.types';

@Injectable()
export class IntentParserService {
  /**
   * 메시지에서 의도와 파라미터 추출 (규칙 기반)
   * AI 호출 없이 90% 처리
   */
  parse(message: string, context?: any): ParsedIntent {
    const normalized = this.normalize(message);
    
    // 1. 의도 파악
    const intent = this.detectIntent(normalized);
    
    // 2. 파라미터 추출
    const params = this.extractParams(normalized, context);
    
    // 3. 신뢰도 계산
    const confidence = this.calculateConfidence(intent, params, normalized);
    
    return {
      intent,
      confidence,
      usedLlm: false,
      params,
      originalText: message,
    };
  }

  /**
   * LLM 호출이 필요한지 판단
   */
  needsLlm(parsed: ParsedIntent): boolean {
    // 신뢰도가 낮으면 LLM 필요
    if (parsed.confidence < 0.6) return true;
    
    // 의도를 파악 못했으면 LLM 필요
    if (parsed.intent === IntentType.UNKNOWN) return true;
    
    // 설명 요청은 LLM이 더 잘함
    if (parsed.intent === IntentType.EXPLAIN) return true;
    
    // 비교 요청도 LLM이 더 잘함
    if (parsed.intent === IntentType.COMPARE) return true;
    
    return false;
  }

  /**
   * 텍스트 정규화
   */
  private normalize(text: string): string {
    return text
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * 의도 감지
   */
  private detectIntent(text: string): IntentType {
    // Groover Code 패턴 체크
    if (/grv\d+-/i.test(text)) {
      return IntentType.RESTORE_CODE;
    }

    // 키워드 매칭으로 의도 파악
    for (const [intent, keywords] of Object.entries(INTENT_KEYWORDS)) {
      if (keywords.some(keyword => text.includes(keyword))) {
        return intent as IntentType;
      }
    }

    // 카테고리 수정 표현 감지
    if (this.hasQuantityModifier(text) && this.hasCategory(text)) {
      return IntentType.REFINE_CART;
    }

    // 예산이 포함되면 장바구니 생성으로 추정
    if (this.extractBudget(text) > 0) {
      return IntentType.CREATE_CART;
    }

    return IntentType.UNKNOWN;
  }

  /**
   * 파라미터 추출
   */
  private extractParams(text: string, context?: any): ParsedIntent['params'] {
    const params: ParsedIntent['params'] = {};

    // 예산 추출
    const budget = this.extractBudget(text);
    if (budget > 0) {
      params.budget = budget;
    }

    // 예산 변경 추출 (+/-)
    const budgetChange = this.extractBudgetChange(text);
    if (budgetChange !== 0) {
      params.budgetChange = budgetChange;
    }

    // 인원 추출
    const familySize = this.extractFamilySize(text);
    if (familySize > 0) {
      params.familySize = familySize;
    }

    // 기간 추출
    const period = this.extractPeriod(text);
    if (period > 0) {
      params.period = period;
    }

    // 카테고리 선호도 추출
    const preferences = this.extractPreferences(text);
    if (Object.keys(preferences).length > 0) {
      params.preferences = preferences;
    }

    // 식이 조건 추출
    const dietary = this.extractDietary(text);
    if (dietary.length > 0) {
      params.dietary = dietary;
    }

    // 가격 전략 추출
    const priceStrategy = this.extractPriceStrategy(text);
    if (priceStrategy) {
      params.priceStrategy = priceStrategy;
    }

    // Groover Code 추출
    const grooverCode = this.extractGrooverCode(text);
    if (grooverCode) {
      params.grooverCode = grooverCode;
    }

    // 컨텍스트에서 기존 추천 ID 가져오기
    if (context?.currentRecommendationId) {
      params.baseRecommendationId = context.currentRecommendationId;
    }

    return params;
  }

  /**
   * 예산 추출 (예: "15만원", "150000원", "10만 5천원")
   */
  private extractBudget(text: string): number {
    // "15만원" 패턴
    const manPattern = /(\d+(?:\.\d+)?)\s*만\s*원?/;
    const manMatch = text.match(manPattern);
    if (manMatch) {
      return parseFloat(manMatch[1]) * 10000;
    }

    // "15만 5천원" 패턴
    const manCheonPattern = /(\d+)\s*만\s*(\d+)\s*천\s*원?/;
    const manCheonMatch = text.match(manCheonPattern);
    if (manCheonMatch) {
      return parseInt(manCheonMatch[1]) * 10000 + parseInt(manCheonMatch[2]) * 1000;
    }

    // "5천원" 패턴
    const cheonPattern = /(\d+)\s*천\s*원?/;
    const cheonMatch = text.match(cheonPattern);
    if (cheonMatch) {
      return parseInt(cheonMatch[1]) * 1000;
    }

    // "150000원" 패턴
    const numPattern = /(\d{4,})\s*원?/;
    const numMatch = text.match(numPattern);
    if (numMatch) {
      return parseInt(numMatch[1]);
    }

    return 0;
  }

  /**
   * 예산 변경량 추출 (예: "5만원 더", "2만원 줄여")
   */
  private extractBudgetChange(text: string): number {
    const budget = this.extractBudget(text);
    if (budget === 0) return 0;

    if (/(더|추가|늘려|올려)/.test(text)) {
      return budget;
    }
    if (/(줄여|빼|내려|적게)/.test(text)) {
      return -budget;
    }

    return 0;
  }

  /**
   * 인원 추출 (예: "4인 가족", "3명")
   */
  private extractFamilySize(text: string): number {
    // "4인 가족" 패턴
    const familyPattern = /(\d+)\s*인\s*(가족|가구)?/;
    const familyMatch = text.match(familyPattern);
    if (familyMatch) {
      return parseInt(familyMatch[1]);
    }

    // "3명" 패턴
    const personPattern = /(\d+)\s*명/;
    const personMatch = text.match(personPattern);
    if (personMatch) {
      return parseInt(personMatch[1]);
    }

    // "혼자" = 1명
    if (/혼자|1인|솔로/.test(text)) {
      return 1;
    }

    return 0;
  }

  /**
   * 기간 추출 (예: "1주일", "3일", "한달")
   */
  private extractPeriod(text: string): number {
    // "1주일" 패턴
    const weekPattern = /(\d+)\s*주(일)?/;
    const weekMatch = text.match(weekPattern);
    if (weekMatch) {
      return parseInt(weekMatch[1]) * 7;
    }

    // "한 주" 패턴
    if (/한\s*주/.test(text)) return 7;

    // "한달" 패턴
    if (/한\s*달|1\s*달|1개월/.test(text)) return 30;

    // "3일" 패턴
    const dayPattern = /(\d+)\s*일/;
    const dayMatch = text.match(dayPattern);
    if (dayMatch) {
      return parseInt(dayMatch[1]);
    }

    return 0;
  }

  /**
   * 카테고리 선호도 추출
   */
  private extractPreferences(text: string): NonNullable<ParsedIntent['params']['preferences']> {
    const preferences: NonNullable<ParsedIntent['params']['preferences']> = {};
    const increase: string[] = [];
    const decrease: string[] = [];
    const exclude: string[] = [];

    for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
      for (const keyword of keywords) {
        if (!text.includes(keyword)) continue;

        // 키워드 주변 컨텍스트 분석
        const keywordIndex = text.indexOf(keyword);
        const before = text.slice(Math.max(0, keywordIndex - 10), keywordIndex);
        const after = text.slice(keywordIndex, keywordIndex + keyword.length + 10);
        const context = before + after;

        // 증가 표현
        if (/(많이|더|늘려|추가)/.test(context)) {
          increase.push(category);
        }
        // 감소 표현
        else if (/(적게|줄여|덜|조금)/.test(context)) {
          decrease.push(category);
        }
        // 제외 표현
        else if (/(빼|없이|말고|제외|싫어)/.test(context)) {
          exclude.push(category);
        }
        // 단순 언급은 증가로 해석
        else {
          increase.push(category);
        }
      }
    }

    if (increase.length > 0) preferences.increase = [...new Set(increase)];
    if (decrease.length > 0) preferences.decrease = [...new Set(decrease)];
    if (exclude.length > 0) preferences.exclude = [...new Set(exclude)];

    return preferences;
  }

  /**
   * 식이 조건 추출
   */
  private extractDietary(text: string): string[] {
    const dietary: string[] = [];

    const dietaryKeywords: Record<string, string[]> = {
      'LOW_CARB': ['저탄수화물', '저탄', '탄수화물 줄여', '탄수 빼'],
      'LOW_SODIUM': ['저염', '짜지 않게', '싱겁게'],
      'LOW_FAT': ['저지방', '기름 적게'],
      'HIGH_PROTEIN': ['고단백', '단백질 많이'],
      'VEGETARIAN': ['채식', '베지테리언', '고기 빼'],
      'DIET': ['다이어트', '체중 관리', '살 빼'],
      'DIABETIC': ['당뇨', '당 줄여', '저당'],
      'BABY_FOOD': ['이유식', '아기 음식'],
    };

    for (const [condition, keywords] of Object.entries(dietaryKeywords)) {
      if (keywords.some(kw => text.includes(kw))) {
        dietary.push(condition);
      }
    }

    return dietary;
  }

  /**
   * 가격 전략 추출
   */
  private extractPriceStrategy(text: string): ParsedIntent['params']['priceStrategy'] | undefined {
    if (/(싸게|저렴|가성비|알뜰)/.test(text)) {
      return 'CHEAPEST';
    }
    if (/(좋은 것|프리미엄|비싸도|최고급)/.test(text)) {
      return 'PREMIUM';
    }
    if (/(적당|밸런스|균형)/.test(text)) {
      return 'BEST_VALUE';
    }
    return undefined;
  }

  /**
   * Groover Code 추출
   */
  private extractGrooverCode(text: string): string | undefined {
    const codePattern = /(GRV\d+-[A-Za-z0-9_-]+)/i;
    const match = text.match(codePattern);
    return match ? match[1] : undefined;
  }

  /**
   * 수량 수정자 있는지 체크
   */
  private hasQuantityModifier(text: string): boolean {
    return Object.keys(QUANTITY_KEYWORDS).some(kw => text.includes(kw)) ||
      /(줄여|늘려|더|덜)/.test(text);
  }

  /**
   * 카테고리 키워드 있는지 체크
   */
  private hasCategory(text: string): boolean {
    return Object.values(CATEGORY_KEYWORDS)
      .flat()
      .some(kw => text.includes(kw));
  }

  /**
   * 신뢰도 계산
   */
  private calculateConfidence(
    intent: IntentType,
    params: ParsedIntent['params'],
    text: string,
  ): number {
    let confidence = 0.5;  // 기본값

    // 의도가 명확하면 +0.2
    if (intent !== IntentType.UNKNOWN) {
      confidence += 0.2;
    }

    // 예산이 있으면 +0.1
    if (params.budget || params.budgetChange) {
      confidence += 0.1;
    }

    // 카테고리 언급이 있으면 +0.1
    if (params.preferences && Object.keys(params.preferences).length > 0) {
      confidence += 0.1;
    }

    // 인원/기간이 있으면 +0.05씩
    if (params.familySize) confidence += 0.05;
    if (params.period) confidence += 0.05;

    // 텍스트가 너무 짧으면 -0.1
    if (text.length < 5) {
      confidence -= 0.1;
    }

    // 텍스트가 너무 길면 (복잡할 수 있음) -0.1
    if (text.length > 100) {
      confidence -= 0.1;
    }

    return Math.max(0, Math.min(1, confidence));
  }
}
