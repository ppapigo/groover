// src/recommendations/chatbot.service.ts
import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

@Injectable()
export class ChatbotService {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async chat(
    userMessage: string,
    conversationHistory: ChatMessage[] = [],
  ): Promise<string> {
    const systemPrompt = `당신은 Groover 쇼핑 추천 챗봇입니다.

역할:
- 사용자의 예산과 요구사항에 맞는 상품을 추천합니다
- 상품 비교 분석을 제공합니다
- 쇼핑 관련 질문에 친절하게 답변합니다
- 최신 트렌드와 가성비 좋은 상품을 안내합니다

규칙:
1. 항상 한국어로 응답하세요
2. 가격은 원화(₩)로 표시하세요
3. 추천할 때는 구체적인 제품명과 대략적인 가격대를 포함하세요
4. 이모지를 적절히 사용해 친근하게 대화하세요
5. 답변은 간결하되 유용한 정보를 포함하세요
6. 장단점을 객관적으로 설명하세요
7. 사용자 예산을 존중하세요

카테고리별 전문 지식:
- 전자제품: 스펙 비교, 성능 차이 설명
- 패션: 스타일 제안, 사이즈 가이드
- 뷰티: 피부 타입별 추천, 성분 설명
- 식품: 영양 정보, 보관법
- 유아용품: 안전 인증, 연령별 추천
- 캠핑/아웃도어: 시즌별 추천, 용도별 비교

응답 형식 예시:
"5만원대 캠핑 의자를 찾으시는군요! 🏕️

추천 제품:
1. **헬리녹스 체어원 라이트** - ₩55,000
   - 초경량(890g), 접이식, 내구성 좋음
   
2. **코베아 릴렉스 체어** - ₩35,000
   - 가성비 좋음, 편안한 착석감

💡 비교 팁: 헬리녹스는 가볍고 튼튼해서 백패킹에 좋고, 코베아는 차박이나 오토캠핑에 추천해요!"`;

    const messages: OpenAI.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.map((msg) => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      })),
      { role: 'user', content: userMessage },
    ];

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages,
        max_tokens: 1000,
        temperature: 0.7,
      });

      return (
        response.choices[0]?.message?.content ||
        '죄송합니다. 응답을 생성할 수 없습니다.'
      );
    } catch (error) {
      console.error('OpenAI API 에러:', error);
      throw new Error('AI 응답 생성 실패');
    }
  }
}
