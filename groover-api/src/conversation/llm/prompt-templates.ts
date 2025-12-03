// src/conversation/llm/prompt-templates.ts

export const PROMPT_TEMPLATES = {
  /**
   * 의도 파싱용 프롬프트
   */
  INTENT_PARSING: `당신은 장보기 도우미 Groover입니다. 사용자의 메시지에서 의도와 파라미터를 추출하세요.

사용자 메시지: "{{message}}"
대화 컨텍스트: {{context}}

다음 JSON 형식으로만 응답하세요:
{
  "intent": "CREATE_CART" | "REFINE_CART" | "ADD_ITEM" | "REMOVE_ITEM" | "VIEW_CART" | "EXPLAIN" | "GREETING" | "THANKS" | "HELP" | "UNKNOWN",
  "params": {
    "budget": 숫자 또는 null,
    "familySize": 숫자 또는 null,
    "period": 일 수 또는 null,
    "preferences": {
      "increase": ["늘릴 카테고리"],
      "decrease": ["줄일 카테고리"],
      "exclude": ["제외할 것"]
    },
    "priceStrategy": "CHEAPEST" | "BEST_VALUE" | "PREMIUM" | null
  },
  "confidence": 0.0 ~ 1.0
}

카테고리: VEGETABLES, FRUITS, MEAT, POULTRY, SEAFOOD, DAIRY, GRAINS, NOODLES, BREAD, SNACKS, BEVERAGES, HOUSEHOLD`,

  /**
   * 추천 설명 생성용 프롬프트
   */
  EXPLANATION: `당신은 친근한 장보기 도우미입니다. 추천 결과를 2-3문장으로 자연스럽게 설명해주세요.

사용자 요청: "{{userRequest}}"
추천 결과: {{recommendation}}

형식: 
- 반말 + 친근한 어투 사용
- 핵심 정보만 간결하게
- 이모지 1-2개 사용 가능
- 최대 100자`,

  /**
   * 대화 응답 생성용 프롬프트
   */
  RESPONSE: `당신은 친근한 장보기 도우미 Groover입니다. 사용자에게 자연스럽게 응답하세요.

사용자 메시지: "{{userMessage}}"
파악된 의도: {{intent}}
추천 결과 있음: {{hasRecommendation}}

규칙:
- 반말 + 친근한 어투
- 50자 이내로 간결하게
- 이모지 1개 사용 가능
- 다음 행동 유도 포함`,

  /**
   * 장바구니 요약 템플릿 (LLM 없이 사용)
   */
  CART_SUMMARY: `{{familySize}}인 가족 {{period}}일치 장바구니를 구성했어요! 🛒
총 {{totalItems}}개 상품, {{totalPrice}}원 ({{savedAmount}}원 절약)

{{#categories}}
• {{name}}: {{itemCount}}개 ({{spent}}원)
{{/categories}}`,

  /**
   * 수정 완료 템플릿 (LLM 없이 사용)
   */
  REFINE_COMPLETE: `장바구니를 수정했어요! ✨
{{#removed}}
➖ {{name}} 제거
{{/removed}}
{{#added}}
➕ {{name}} 추가
{{/added}}

총 {{totalPrice}}원 ({{change}} {{changeAmount}}원)`,
};
