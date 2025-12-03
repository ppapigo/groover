// src/conversation/conversation.service.ts
import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RecommendationsService } from '../recommendations/recommendations.service';
import { IntentParserService } from './intent/intent-parser.service';
import { LlmAdapterService } from './llm/llm-adapter.service';
import { ResponseGeneratorService } from './response/response-generator.service';
import { IntentType, ParsedIntent, CATEGORY_KEYWORDS } from './intent/intent.types';
import { SendMessageDto } from './dto/send-message.dto';

export interface ConversationContext {
  conversationId: string;
  userId: string;
  currentRecommendationId?: string;
  parsedContext?: any;
}

export interface MessageResult {
  conversationId: string;
  messageId: string;
  intent: IntentType;
  message: string;
  suggestions: string[];
  recommendation?: any;
  grooverCode?: string;
  changes?: any;
  usedLlm: boolean;
  processingTimeMs: number;
}

@Injectable()
export class ConversationService {
  private readonly logger = new Logger(ConversationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly intentParser: IntentParserService,
    private readonly llmAdapter: LlmAdapterService,
    private readonly responseGenerator: ResponseGeneratorService,
    private readonly recommendationsService: RecommendationsService,
  ) {}

  /**
   * 새 대화 시작
   */
  async startConversation(userId: string): Promise<{
    conversationId: string;
    message: string;
    suggestions: string[];
  }> {
    const conversation = await this.prisma.conversation.create({
      data: {
        userId,
        status: 'ACTIVE',
      },
    });

    const greeting = this.responseGenerator.generate({
      intent: IntentType.GREETING,
      params: {},
    });

    // 인사 메시지 저장
    await this.prisma.conversationMessage.create({
      data: {
        conversationId: conversation.id,
        role: 'ASSISTANT',
        content: greeting.message,
      },
    });

    return {
      conversationId: conversation.id,
      message: greeting.message,
      suggestions: greeting.suggestions,
    };
  }

  /**
   * 메시지 처리 (핵심 로직)
   */
  async processMessage(
    conversationId: string,
    userId: string,
    dto: SendMessageDto,
  ): Promise<MessageResult> {
    const startTime = Date.now();

    // 1. 대화 조회
    const conversation = await this.getConversation(conversationId, userId);

    // 2. 사용자 메시지 저장
    const userMessage = await this.prisma.conversationMessage.create({
      data: {
        conversationId,
        role: 'USER',
        content: dto.message,
      },
    });

    // 3. 의도 파싱 (규칙 기반 먼저)
    let parsed = this.intentParser.parse(dto.message, conversation.currentContext);

    // 4. 규칙 기반 파싱 실패 시 LLM 사용
    if (this.intentParser.needsLlm(parsed)) {
      this.logger.log('Rule-based parsing insufficient, using LLM');
      parsed = await this.llmAdapter.parseIntent(dto.message, conversation.currentContext);
    }

    // 5. 기존 추천 ID 설정
    if (conversation.currentRecommendationId) {
      parsed.params.baseRecommendationId = conversation.currentRecommendationId;
    }

    // 6. 의도에 따른 액션 수행
    const actionResult = await this.executeAction(
      parsed,
      { conversationId, userId, ...conversation },
    );

    // 7. 응답 생성
    const response = this.responseGenerator.generate({
      intent: parsed.intent,
      params: parsed.params,
      recommendation: actionResult.recommendation,
      changes: actionResult.changes,
    });

    // 8. 어시스턴트 메시지 저장
    await this.prisma.conversationMessage.create({
      data: {
        conversationId,
        role: 'ASSISTANT',
        content: response.message,
        parsedIntent: parsed.intent,
        parsedParams: parsed.params,
        usedLlm: parsed.usedLlm || response.usedLlm,
        recommendationId: actionResult.recommendation?.recommendationId,
        processingTimeMs: Date.now() - startTime,
      },
    });

    // 9. 대화 컨텍스트 업데이트
    if (actionResult.recommendation?.recommendationId) {
      await this.prisma.conversation.update({
        where: { id: conversationId },
        data: {
          currentRecommendationId: actionResult.recommendation.recommendationId,
          currentContext: {
            ...conversation.currentContext,
            ...parsed.params,
          },
        },
      });
    }

    return {
      conversationId,
      messageId: userMessage.id,
      intent: parsed.intent,
      message: response.message,
      suggestions: response.suggestions,
      recommendation: actionResult.recommendation,
      grooverCode: actionResult.recommendation?.grooverCode,
      changes: actionResult.changes,
      usedLlm: parsed.usedLlm || response.usedLlm,
      processingTimeMs: Date.now() - startTime,
    };
  }

  /**
   * 의도에 따른 액션 수행
   */
  private async executeAction(
    parsed: ParsedIntent,
    context: ConversationContext,
  ): Promise<{ recommendation?: any; changes?: any }> {
    switch (parsed.intent) {
      case IntentType.CREATE_CART:
        return this.createCart(parsed, context);

      case IntentType.REFINE_CART:
        return this.refineCart(parsed, context);

      case IntentType.ADD_ITEM:
        return this.addItem(parsed, context);

      case IntentType.REMOVE_ITEM:
        return this.removeItem(parsed, context);

      case IntentType.VIEW_CART:
        return this.viewCart(context);

      case IntentType.RESTORE_CODE:
        return this.restoreFromCode(parsed, context);

      default:
        return {};
    }
  }

  /**
   * 장바구니 생성
   */
  private async createCart(
    parsed: ParsedIntent,
    context: ConversationContext,
  ): Promise<{ recommendation: any }> {
    const { params } = parsed;

    // 예산 기본값
    const budget = params.budget || 100000;

    // 카테고리 비율 계산
    const categories = this.calculateCategoryRatios(params);

    // 추천 엔진 호출
    const recommendation = await this.recommendationsService.createRecommendation(
      context.userId,
      {
        totalBudget: budget,
        categories,
        priceStrategy: params.priceStrategy || 'BEST_VALUE',
        preferredBrands: params.preferences?.increase?.flatMap(
          (cat) => CATEGORY_KEYWORDS[cat] || []
        ),
        includeAlternatives: true,
      },
    );

    return { recommendation };
  }

  /**
   * 장바구니 수정
   */
  private async refineCart(
    parsed: ParsedIntent,
    context: ConversationContext,
  ): Promise<{ recommendation?: any; changes?: any }> {
    if (!context.currentRecommendationId) {
      // 기존 장바구니가 없으면 새로 생성
      return this.createCart(parsed, context);
    }

    // 기존 추천 조회
    const existingRec = await this.recommendationsService.getRecommendation(
      context.currentRecommendationId,
    );

    // 수정된 카테고리 비율 계산
    const adjustedCategories = this.adjustCategoryRatios(
      existingRec.result?.categories || [],
      parsed.params.preferences,
    );

    // 새 추천 생성
    const recommendation = await this.recommendationsService.createRecommendation(
      context.userId,
      {
        totalBudget: existingRec.totalBudget + (parsed.params.budgetChange || 0),
        categories: adjustedCategories,
        priceStrategy: parsed.params.priceStrategy || 'BEST_VALUE',
        includeAlternatives: true,
      },
    );

    // 변경 내용 계산
    const changes = this.calculateChanges(existingRec, recommendation);

    return { recommendation, changes };
  }

  /**
   * 상품 추가
   */
  private async addItem(
    parsed: ParsedIntent,
    context: ConversationContext,
  ): Promise<{ changes: any }> {
    // TODO: 상품 검색 및 추가 로직
    return {
      changes: {
        added: parsed.params.productNames?.map((name) => ({ name })) || [],
      },
    };
  }

  /**
   * 상품 제거
   */
  private async removeItem(
    parsed: ParsedIntent,
    context: ConversationContext,
  ): Promise<{ changes: any }> {
    // TODO: 상품 제거 로직
    return {
      changes: {
        removed: parsed.params.productNames?.map((name) => ({ name })) || [],
      },
    };
  }

  /**
   * 장바구니 조회
   */
  private async viewCart(
    context: ConversationContext,
  ): Promise<{ recommendation?: any }> {
    if (!context.currentRecommendationId) {
      return {};
    }

    const recommendation = await this.recommendationsService.getRecommendation(
      context.currentRecommendationId,
    );

    return { recommendation };
  }

  /**
   * 코드로 복원
   */
  private async restoreFromCode(
    parsed: ParsedIntent,
    context: ConversationContext,
  ): Promise<{ recommendation?: any }> {
    // TODO: Groover Code 복원 로직
    return {};
  }

  /**
   * 카테고리 비율 계산
   */
  private calculateCategoryRatios(
    params: ParsedIntent['params'],
  ): Array<{ category: string; ratio: number; priority: number }> {
    // 기본 비율
    const defaultRatios: Record<string, number> = {
      FOOD: 0.60,
      HOUSEHOLD: 0.20,
      BEAUTY: 0.10,
      HEALTH: 0.10,
    };

    // 선호도에 따라 조정
    const preferences = params.preferences;
    
    if (preferences?.increase) {
      for (const cat of preferences.increase) {
        if (defaultRatios[cat] !== undefined) {
          defaultRatios[cat] = Math.min(1, defaultRatios[cat] * 1.5);
        }
      }
    }

    if (preferences?.decrease) {
      for (const cat of preferences.decrease) {
        if (defaultRatios[cat] !== undefined) {
          defaultRatios[cat] = Math.max(0, defaultRatios[cat] * 0.5);
        }
      }
    }

    // 비율 정규화
    const total = Object.values(defaultRatios).reduce((a, b) => a + b, 0);
    
    return Object.entries(defaultRatios)
      .filter(([_, ratio]) => ratio > 0)
      .map(([category, ratio], index) => ({
        category,
        ratio: ratio / total,
        priority: index + 1,
      }));
  }

  /**
   * 카테고리 비율 조정
   */
  private adjustCategoryRatios(
    existingCategories: any[],
    preferences?: ParsedIntent['params']['preferences'],
  ): Array<{ category: string; ratio: number; priority: number }> {
    if (!preferences) {
      return existingCategories.map((cat, i) => ({
        category: cat.category,
        ratio: cat.allocatedBudget > 0 ? 0.25 : 0,
        priority: i + 1,
      }));
    }

    // 기존 비율 기반으로 조정
    const ratios: Record<string, number> = {};
    
    for (const cat of existingCategories) {
      ratios[cat.category] = 0.25;
    }

    // 증가
    if (preferences.increase) {
      for (const cat of preferences.increase) {
        ratios[cat] = (ratios[cat] || 0.1) * 1.5;
      }
    }

    // 감소
    if (preferences.decrease) {
      for (const cat of preferences.decrease) {
        if (ratios[cat]) {
          ratios[cat] *= 0.5;
        }
      }
    }

    // 제외
    if (preferences.exclude) {
      for (const cat of preferences.exclude) {
        delete ratios[cat];
      }
    }

    // 정규화
    const total = Object.values(ratios).reduce((a, b) => a + b, 0) || 1;

    return Object.entries(ratios).map(([category, ratio], index) => ({
      category,
      ratio: ratio / total,
      priority: index + 1,
    }));
  }

  /**
   * 변경 내용 계산
   */
  private calculateChanges(existing: any, newRec: any): any {
    // 간단한 비교 (실제로는 더 정교하게)
    return {
      removed: [],
      added: [],
      budgetChange: (newRec.summary?.totalPrice || 0) - (existing.totalPrice || 0),
    };
  }

  /**
   * 대화 조회
   */
  private async getConversation(conversationId: string, userId: string): Promise<any> {
    const conversation = await this.prisma.conversation.findFirst({
      where: {
        id: conversationId,
        userId,
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    return conversation;
  }

  /**
   * 대화 기록 조회
   */
  async getConversationHistory(conversationId: string, userId: string): Promise<any> {
    const conversation = await this.prisma.conversation.findFirst({
      where: { id: conversationId, userId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    return {
      conversationId: conversation.id,
      status: conversation.status,
      currentRecommendationId: conversation.currentRecommendationId,
      messages: conversation.messages.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        intent: m.parsedIntent,
        usedLlm: m.usedLlm,
        createdAt: m.createdAt,
      })),
      createdAt: conversation.createdAt,
    };
  }

  /**
   * 사용자의 대화 목록 조회
   */
  async getConversations(userId: string): Promise<any[]> {
    const conversations = await this.prisma.conversation.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      take: 10,
      include: {
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    return conversations.map((c) => ({
      conversationId: c.id,
      status: c.status,
      lastMessage: c.messages[0]?.content,
      updatedAt: c.updatedAt,
    }));
  }
}
