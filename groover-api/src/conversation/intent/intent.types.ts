// src/conversation/intent/intent.types.ts

/**
 * 사용자 의도 타입
 */
export enum IntentType {
  // 장바구니 생성/추천
  CREATE_CART = 'CREATE_CART',
  
  // 장바구니 수정
  REFINE_CART = 'REFINE_CART',
  ADD_ITEM = 'ADD_ITEM',
  REMOVE_ITEM = 'REMOVE_ITEM',
  CHANGE_QUANTITY = 'CHANGE_QUANTITY',
  
  // 조회/질문
  VIEW_CART = 'VIEW_CART',
  EXPLAIN = 'EXPLAIN',
  COMPARE = 'COMPARE',
  
  // 코드 관련
  GENERATE_CODE = 'GENERATE_CODE',
  RESTORE_CODE = 'RESTORE_CODE',
  
  // 대화
  GREETING = 'GREETING',
  THANKS = 'THANKS',
  HELP = 'HELP',
  
  // 파싱 실패
  UNKNOWN = 'UNKNOWN',
}

/**
 * 파싱된 의도 결과
 */
export interface ParsedIntent {
  intent: IntentType;
  confidence: number;  // 0.0 ~ 1.0
  usedLlm: boolean;
  
  // 추출된 파라미터들
  params: {
    // 예산 관련
    budget?: number;
    budgetChange?: number;  // +/- 금액
    
    // 인원/기간
    familySize?: number;
    period?: number;  // 일 단위
    
    // 카테고리 선호도
    preferences?: {
      increase?: string[];  // 늘릴 카테고리
      decrease?: string[];  // 줄일 카테고리
      exclude?: string[];   // 제외할 것
    };
    
    // 가격 전략
    priceStrategy?: 'CHEAPEST' | 'BEST_VALUE' | 'PREMIUM';
    
    // 특수 조건
    dietary?: string[];  // 다이어트, 당뇨, 저염 등
    
    // 상품 관련
    productNames?: string[];
    quantities?: number[];
    
    // Groover Code
    grooverCode?: string;
    
    // 기존 추천 참조
    baseRecommendationId?: string;
  };
  
  // 원본 텍스트
  originalText: string;
}

/**
 * 카테고리 매핑
 */
export const CATEGORY_KEYWORDS: Record<string, string[]> = {
  VEGETABLES: ['채소', '야채', '샐러드', '시금치', '당근', '양파', '배추', '무', '오이', '토마토'],
  FRUITS: ['과일', '사과', '배', '귤', '오렌지', '바나나', '포도', '딸기', '수박', '멜론'],
  MEAT: ['고기', '정육', '소고기', '돼지', '삼겹살', '목살', '안심', '등심', '갈비'],
  POULTRY: ['닭', '닭고기', '닭가슴살', '닭다리', '오리'],
  SEAFOOD: ['해산물', '생선', '고등어', '삼치', '오징어', '새우', '조개'],
  DAIRY: ['유제품', '우유', '요거트', '치즈', '버터', '요구르트'],
  GRAINS: ['탄수화물', '쌀', '밥', '곡물', '현미'],
  NOODLES: ['면', '라면', '국수', '파스타', '스파게티'],
  BREAD: ['빵', '베이커리', '식빵', '바게트'],
  SNACKS: ['간식', '과자', '초콜릿', '사탕', '젤리'],
  BEVERAGES: ['음료', '물', '주스', '커피', '차'],
  HOUSEHOLD: ['생필품', '휴지', '세제', '샴푸', '치약'],
  BABY: ['아기', '유아', '분유', '기저귀'],
  PET: ['반려동물', '사료', '강아지', '고양이'],
};

/**
 * 수량 표현 매핑
 */
export const QUANTITY_KEYWORDS: Record<string, number> = {
  '많이': 1.5,
  '조금': 0.5,
  '좀': 0.7,
  '약간': 0.6,
  '더': 1.3,
  '덜': 0.7,
  '반': 0.5,
  '배로': 2.0,
};

/**
 * 의도 키워드 매핑
 */
export const INTENT_KEYWORDS: Record<IntentType, string[]> = {
  [IntentType.CREATE_CART]: ['장봐줘', '장보기', '추천해줘', '구성해줘', '만들어줘', '짜줘'],
  [IntentType.REFINE_CART]: ['수정해줘', '바꿔줘', '조정해줘', '변경해줘'],
  [IntentType.ADD_ITEM]: ['추가해줘', '넣어줘', '담아줘', '더해줘'],
  [IntentType.REMOVE_ITEM]: ['빼줘', '제거해줘', '없애줘', '삭제해줘'],
  [IntentType.CHANGE_QUANTITY]: ['줄여줘', '늘려줘', '적게', '많게'],
  [IntentType.VIEW_CART]: ['보여줘', '확인해줘', '뭐가 있어', '뭐 담았어'],
  [IntentType.EXPLAIN]: ['왜', '이유', '설명해줘', '어떻게'],
  [IntentType.COMPARE]: ['비교해줘', '뭐가 나아', '차이가'],
  [IntentType.GENERATE_CODE]: ['코드', '공유', '저장'],
  [IntentType.RESTORE_CODE]: ['불러와', '복원', 'GRV'],
  [IntentType.GREETING]: ['안녕', '하이', '헬로'],
  [IntentType.THANKS]: ['고마워', '감사', '땡큐'],
  [IntentType.HELP]: ['도움', '어떻게 써', '사용법'],
  [IntentType.UNKNOWN]: [],
};
