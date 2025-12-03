// src/conversation/response/response-generator.service.ts
import { Injectable } from '@nestjs/common';
import { IntentType, ParsedIntent } from '../intent/intent.types';

interface ResponseContext {
  intent: IntentType;
  params: ParsedIntent['params'];
  recommendation?: any;
  changes?: {
    removed?: any[];
    added?: any[];
    modified?: any[];
  };
}

interface GeneratedResponse {
  message: string;
  suggestions: string[];
  usedLlm: boolean;
}

@Injectable()
export class ResponseGeneratorService {
  /**
   * 템플릿 기반 응답 생성 (AI 비용 $0)
   */
  generate(context: ResponseContext): GeneratedResponse {
    const { intent, params, recommendation, changes } = context;

    switch (intent) {
      case IntentType.CREATE_CART:
        return this.generateCartCreatedResponse(params, recommendation);
      
      case IntentType.REFINE_CART:
        return this.generateRefineResponse(params, recommendation, changes);
      
      case IntentType.ADD_ITEM:
        return this.generateAddItemResponse(changes);
      
      case IntentType.REMOVE_ITEM:
        return this.generateRemoveItemResponse(changes);
      
      case IntentType.VIEW_CART:
        return this.generateViewCartResponse(recommendation);
      
      case IntentType.GENERATE_CODE:
        return this.generateCodeResponse(recommendation);
      
      case IntentType.RESTORE_CODE:
        return this.generateRestoreResponse(recommendation);
      
      case IntentType.GREETING:
        return this.generateGreetingResponse();
      
      case IntentType.THANKS:
        return this.generateThanksResponse();
      
      case IntentType.HELP:
        return this.generateHelpResponse();
      
      default:
        return this.generateUnknownResponse();
    }
  }

  /**
   * 장바구니 생성 완료 응답
   */
  private generateCartCreatedResponse(
    params: ParsedIntent['params'],
    recommendation: any,
  ): GeneratedResponse {
    const summary = recommendation?.summary || {};
    const familySize = params?.familySize || '';
    const period = params?.period || '';
    
    let message = '';
    
    // 기본 메시지 구성
    if (familySize && period) {
      message = `${familySize}인 가족 ${period}일치 장바구니를 구성했어요! 🛒\n`;
    } else if (summary.totalBudget) {
      message = `${summary.totalBudget.toLocaleString()}원 예산으로 장바구니를 구성했어요! 🛒\n`;
    } else {
      message = '장바구니를 구성했어요! 🛒\n';
    }

    // 요약 정보
    message += `\n총 ${summary.totalItems || 0}개 상품, ${(summary.totalPrice || 0).toLocaleString()}원`;
    
    if (summary.savedAmount > 0) {
      message += ` (${summary.savedAmount.toLocaleString()}원 절약!)`;
    }

    // 카테고리별 요약
    if (recommendation?.categories?.length > 0) {
      message += '\n\n';
      for (const cat of recommendation.categories.slice(0, 4)) {
        if (cat.items?.length > 0) {
          message += `• ${this.getCategoryName(cat.category)}: ${cat.items.length}개 `;
          message += `(${cat.actualSpent.toLocaleString()}원)\n`;
        }
      }
    }

    return {
      message: message.trim(),
      suggestions: [
        '채소 더 추가해줘',
        '간식 넣어줘',
        '예산 줄여줘',
        '코드로 저장해줘',
      ],
      usedLlm: false,
    };
  }

  /**
   * 장바구니 수정 완료 응답
   */
  private generateRefineResponse(
    params: ParsedIntent['params'],
    recommendation: any,
    changes?: any,
  ): GeneratedResponse {
    let message = '장바구니를 수정했어요! ✨\n';

    // 변경 내용
    if (changes?.removed?.length > 0) {
      message += '\n';
      for (const item of changes.removed.slice(0, 3)) {
        message += `➖ ${item.name} 제거\n`;
      }
    }

    if (changes?.added?.length > 0) {
      message += '\n';
      for (const item of changes.added.slice(0, 3)) {
        message += `➕ ${item.name} 추가\n`;
      }
    }

    // 새 총액
    const summary = recommendation?.summary;
    if (summary) {
      message += `\n총 ${summary.totalPrice.toLocaleString()}원`;
      
      if (summary.savedAmount > 0) {
        message += ` (${summary.savedAmount.toLocaleString()}원 절약!)`;
      }
    }

    return {
      message: message.trim(),
      suggestions: [
        '더 수정해줘',
        '이대로 저장해줘',
        '원래대로 돌려줘',
      ],
      usedLlm: false,
    };
  }

  /**
   * 상품 추가 응답
   */
  private generateAddItemResponse(changes?: any): GeneratedResponse {
    const added = changes?.added?.[0];
    const message = added
      ? `${added.name}을(를) 장바구니에 담았어요! 🛒`
      : '상품을 추가했어요!';

    return {
      message,
      suggestions: ['더 담을래', '장바구니 보여줘'],
      usedLlm: false,
    };
  }

  /**
   * 상품 제거 응답
   */
  private generateRemoveItemResponse(changes?: any): GeneratedResponse {
    const removed = changes?.removed?.[0];
    const message = removed
      ? `${removed.name}을(를) 장바구니에서 뺐어요!`
      : '상품을 제거했어요!';

    return {
      message,
      suggestions: ['대신 뭐 넣을까?', '장바구니 보여줘'],
      usedLlm: false,
    };
  }

  /**
   * 장바구니 조회 응답
   */
  private generateViewCartResponse(recommendation: any): GeneratedResponse {
    if (!recommendation) {
      return {
        message: '아직 장바구니가 비어있어요. 예산을 알려주시면 추천해드릴게요! 😊',
        suggestions: ['10만원으로 장봐줘', '1주일 식비 추천해줘'],
        usedLlm: false,
      };
    }

    const summary = recommendation.summary || {};
    let message = `📋 현재 장바구니\n\n`;
    message += `총 ${summary.totalItems || 0}개 상품\n`;
    message += `합계: ${(summary.totalPrice || 0).toLocaleString()}원`;

    if (recommendation.categories) {
      message += '\n\n';
      for (const cat of recommendation.categories) {
        if (cat.items?.length > 0) {
          message += `[${this.getCategoryName(cat.category)}]\n`;
          for (const item of cat.items.slice(0, 3)) {
            message += `• ${item.name} ${item.price.toLocaleString()}원\n`;
          }
          if (cat.items.length > 3) {
            message += `  ...외 ${cat.items.length - 3}개\n`;
          }
          message += '\n';
        }
      }
    }

    return {
      message: message.trim(),
      suggestions: ['수정해줘', '코드로 저장해줘', '쇼핑 링크 보여줘'],
      usedLlm: false,
    };
  }

  /**
   * 코드 생성 응답
   */
  private generateCodeResponse(recommendation: any): GeneratedResponse {
    const code = recommendation?.grooverCode || 'GRV1-XXXXX';
    
    return {
      message: `장바구니 코드가 생성됐어요! 📝\n\n` +
        `\`${code}\`\n\n` +
        `이 코드를 친구에게 공유하거나, 나중에 붙여넣으면 똑같은 장바구니를 불러올 수 있어요!`,
      suggestions: ['코드 복사하기', '카카오톡 공유'],
      usedLlm: false,
    };
  }

  /**
   * 코드 복원 응답
   */
  private generateRestoreResponse(recommendation: any): GeneratedResponse {
    if (!recommendation) {
      return {
        message: '코드를 찾을 수 없어요. 올바른 Groover Code를 붙여넣어주세요!',
        suggestions: ['GRV1-XXXXX 형식이에요'],
        usedLlm: false,
      };
    }

    const summary = recommendation.summary || {};
    
    return {
      message: `장바구니를 불러왔어요! 🎉\n\n` +
        `${summary.totalItems || 0}개 상품, ` +
        `${(summary.totalPrice || 0).toLocaleString()}원`,
      suggestions: ['수정해줘', '이대로 저장해줘', '쇼핑 링크 보여줘'],
      usedLlm: false,
    };
  }

  /**
   * 인사 응답
   */
  private generateGreetingResponse(): GeneratedResponse {
    const greetings = [
      '안녕하세요! 오늘 장보기 도와드릴까요? 🛒',
      '반가워요! 예산을 알려주시면 장바구니를 추천해드릴게요 😊',
      '안녕하세요! 어떤 장보기를 도와드릴까요?',
    ];

    return {
      message: greetings[Math.floor(Math.random() * greetings.length)],
      suggestions: [
        '10만원으로 1주일 장봐줘',
        '다이어트 식단 추천해줘',
        '4인 가족 장보기',
      ],
      usedLlm: false,
    };
  }

  /**
   * 감사 응답
   */
  private generateThanksResponse(): GeneratedResponse {
    const responses = [
      '도움이 됐다니 기뻐요! 또 필요하면 말씀해주세요 😊',
      '천만에요! 좋은 장보기 되세요! 🛍️',
      '항상 도와드릴게요! 다음에 또 찾아주세요 👋',
    ];

    return {
      message: responses[Math.floor(Math.random() * responses.length)],
      suggestions: ['새 장바구니 만들기', '과거 기록 보기'],
      usedLlm: false,
    };
  }

  /**
   * 도움말 응답
   */
  private generateHelpResponse(): GeneratedResponse {
    return {
      message: `Groover 사용법이에요! 📖\n\n` +
        `1️⃣ 예산과 기간을 말해주세요\n` +
        `   "15만원으로 1주일 장봐줘"\n\n` +
        `2️⃣ 원하는 스타일을 추가해요\n` +
        `   "채소 많이, 간식 빼고"\n\n` +
        `3️⃣ 추천 받은 후 수정도 가능해요\n` +
        `   "탄수화물 줄여줘"\n\n` +
        `4️⃣ 마음에 들면 코드로 저장해요\n` +
        `   "코드로 저장해줘"`,
      suggestions: ['바로 시작하기', '예산 10만원으로 시작'],
      usedLlm: false,
    };
  }

  /**
   * 알 수 없는 의도 응답
   */
  private generateUnknownResponse(): GeneratedResponse {
    return {
      message: '잘 이해하지 못했어요 😅\n예산과 원하시는 스타일을 말씀해주시겠어요?',
      suggestions: [
        '10만원으로 장봐줘',
        '1주일 식비 추천해줘',
        '도움말 보기',
      ],
      usedLlm: false,
    };
  }

  /**
   * 카테고리 한글 이름
   */
  private getCategoryName(category: string): string {
    const names: Record<string, string> = {
      VEGETABLES: '채소',
      FRUITS: '과일',
      MEAT: '정육',
      POULTRY: '닭/오리',
      SEAFOOD: '해산물',
      DAIRY: '유제품',
      GRAINS: '곡물/쌀',
      NOODLES: '면류',
      BREAD: '빵',
      SNACKS: '간식',
      BEVERAGES: '음료',
      HOUSEHOLD: '생필품',
      BABY: '유아용품',
      PET: '반려동물',
      FOOD: '식품',
      BEAUTY: '뷰티',
      HEALTH: '건강',
    };

    return names[category] || category;
  }
}
