# 💬 Conversation Module - 대화형 추천

ChatGPT처럼 자연어로 장바구니를 설계/수정하는 대화형 추천 모드!

## 🎯 핵심 원칙: AI 비용 최소화

```
┌─────────────────────────────────────────────────────────────────────┐
│                    처리 흐름                                         │
│                                                                      │
│  유저 메시지                                                         │
│       │                                                              │
│       ▼                                                              │
│  ┌─────────────────────────────────────────┐                        │
│  │ 1. 규칙 기반 Intent Parsing (90%)       │ ← AI 비용 $0           │
│  │    - 정규식: 숫자+만원, 숫자+인         │                        │
│  │    - 키워드: 장봐줘, 줄여줘, 늘려줘     │                        │
│  │    - 카테고리: 채소, 고기, 과일         │                        │
│  └─────────────────────────────────────────┘                        │
│       │                                                              │
│       ▼                                                              │
│  ┌─────────────────────────────────────────┐                        │
│  │ 2. 신뢰도 < 0.6 ?                        │                        │
│  │    YES → LLM 호출 (10%)                 │ ← 비용 발생            │
│  │    NO  → 다음 단계                      │                        │
│  └─────────────────────────────────────────┘                        │
│       │                                                              │
│       ▼                                                              │
│  ┌─────────────────────────────────────────┐                        │
│  │ 3. 추천 엔진 호출 (규칙/스코어링)        │ ← AI 비용 $0           │
│  └─────────────────────────────────────────┘                        │
│       │                                                              │
│       ▼                                                              │
│  ┌─────────────────────────────────────────┐                        │
│  │ 4. 템플릿 기반 응답 생성 (90%)           │ ← AI 비용 $0           │
│  │    복잡한 설명 필요시 → LLM (10%)        │                        │
│  └─────────────────────────────────────────┘                        │
│                                                                      │
│  💰 예상 비용: 요청당 $0.0003 (90% 규칙 기반)                       │
│  💰 월 비용 (DAU 1,000명): ~$27 (vs 전체 LLM: $270)                 │
└─────────────────────────────────────────────────────────────────────┘
```

## 📁 파일 구조

```
src/conversation/
├── conversation.module.ts
├── conversation.controller.ts
├── conversation.service.ts
├── intent/
│   ├── intent-parser.service.ts    # 규칙 기반 의도 파악 (핵심!)
│   └── intent.types.ts             # 의도 타입 정의
├── llm/
│   ├── llm-adapter.service.ts      # LLM 호출 (최소화)
│   └── prompt-templates.ts         # 프롬프트 템플릿
├── response/
│   └── response-generator.service.ts # 템플릿 기반 응답
└── dto/
    └── send-message.dto.ts
```

## 🔧 설치

### 1. 패키지 설치
```powershell
npm install @nestjs/axios axios
```

### 2. 파일 복사
`src/conversation/` → `C:\dev\groover\groover-api\src\conversation\`

### 3. app.module.ts 수정
```typescript
import { ConversationModule } from './conversation/conversation.module';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [
    // ...
    HttpModule,
    ConversationModule,
  ],
})
```

### 4. Prisma 스키마 업데이트
`prisma/schema-additions.prisma` 내용을 `schema.prisma`에 추가

### 5. 마이그레이션
```powershell
npx prisma migrate dev --name add_conversation
npx prisma generate
```

### 6. 환경변수 (선택: LLM 사용 시)
```env
# .env
ANTHROPIC_API_KEY=sk-ant-xxxxx
```

### 7. 서버 재시작
```powershell
npm run start:dev
```

## 📡 API

| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | /v1/conversations | 새 대화 시작 |
| POST | /v1/conversations/:id/messages | 메시지 전송 |
| GET | /v1/conversations/:id | 대화 기록 조회 |
| GET | /v1/conversations | 내 대화 목록 |

## 🧪 테스트

```powershell
# 로그인
$login = Invoke-RestMethod -Uri "http://localhost:3000/v1/auth/login" -Method POST -ContentType "application/json" -Body '{"email":"test@groover.com","password":"password123"}'
$token = $login.accessToken
$headers = @{ Authorization = "Bearer $token" }

# 1. 대화 시작
$conv = Invoke-RestMethod -Uri "http://localhost:3000/v1/conversations" -Method POST -Headers $headers
$convId = $conv.data.conversationId

# 2. 메시지 전송 - 장바구니 생성
Invoke-RestMethod -Uri "http://localhost:3000/v1/conversations/$convId/messages" -Method POST -ContentType "application/json" -Headers $headers -Body '{"message":"4인 가족 1주일 식비 15만원으로 장봐줘. 채소 많이"}'

# 3. 메시지 전송 - 수정 요청
Invoke-RestMethod -Uri "http://localhost:3000/v1/conversations/$convId/messages" -Method POST -ContentType "application/json" -Headers $headers -Body '{"message":"탄수화물 좀 줄여줘"}'

# 4. 메시지 전송 - 추가 요청
Invoke-RestMethod -Uri "http://localhost:3000/v1/conversations/$convId/messages" -Method POST -ContentType "application/json" -Headers $headers -Body '{"message":"간식도 넣어줘"}'
```

## 🗣️ 지원하는 표현 예시

### 장바구니 생성
- "15만원으로 1주일 장봐줘"
- "4인 가족 한달 식비 추천해줘"
- "다이어트 식단으로 10만원 장보기"

### 장바구니 수정
- "채소 더 넣어줘"
- "탄수화물 줄여줘"
- "고기 빼고 생선으로"
- "예산 5만원 더 추가"

### 상품 관리
- "사과 추가해줘"
- "라면 빼줘"
- "우유 2개로 늘려줘"

### 조회/저장
- "장바구니 보여줘"
- "코드로 저장해줘"
- "GRV1-xxxxx 불러와"

## 💡 규칙 기반 파싱 예시

```
입력: "4인 가족 1주일 식비 15만원으로 장봐줘. 채소 많이"

파싱 결과:
{
  intent: "CREATE_CART",
  confidence: 0.95,
  usedLlm: false,
  params: {
    budget: 150000,
    familySize: 4,
    period: 7,
    preferences: {
      increase: ["VEGETABLES"]
    }
  }
}

→ LLM 호출 없이 처리 완료!
```

## 📊 비용 비교

| 방식 | 일 1,000명 | 월 비용 |
|------|-----------|---------|
| 모든 요청 LLM | 3,000 호출 | ~$270 |
| **Groover (규칙 90%)** | 300 호출 | **~$27** |

✅ **90% 비용 절감!**
