# 🔗 Groover Code Module

하스스톤 덱코드처럼 장바구니를 코드로 공유하는 기능!

## 📁 파일 구조

```
src/groover-code/
├── groover-code.module.ts
├── groover-code.controller.ts
├── groover-code.service.ts
└── dto/
    ├── encode-cart.dto.ts
    ├── decode-code.dto.ts
    └── save-to-cart.dto.ts
```

## 🔧 설치

### 1. 파일 복사
`src/groover-code/` 폴더를 `C:\dev\groover\groover-api\src\groover-code\`에 복사

### 2. app.module.ts 수정

```typescript
import { GrooverCodeModule } from './groover-code/groover-code.module';

@Module({
  imports: [
    // ... 기존 모듈들
    GrooverCodeModule,  // 추가
  ],
})
export class AppModule {}
```

### 3. 서버 재시작
```powershell
npm run start:dev
```

## 📡 API 엔드포인트

| Method | Endpoint | 설명 | 인증 |
|--------|----------|------|------|
| POST | /v1/codes/encode | 장바구니 → 코드 변환 | ✅ |
| POST | /v1/codes/decode | 코드 → 장바구니 정보 | ❌ |
| POST | /v1/codes/save | 코드로 장바구니 생성 | ✅ |
| GET | /v1/codes/:code | 코드 정보/통계 | ❌ |
| GET | /v1/codes/:code/decode | 코드 디코딩 (GET) | ❌ |
| GET | /v1/codes/cart/:cartId/links | 쇼핑 링크 생성 | ✅ |

## 🧪 테스트

```powershell
# 로그인
$login = Invoke-RestMethod -Uri "http://localhost:3000/v1/auth/login" -Method POST -ContentType "application/json" -Body '{"email":"test@groover.com","password":"password123"}'
$token = $login.accessToken
$headers = @{ Authorization = "Bearer $token" }

# 1. 장바구니 → Groover Code 생성
$cartId = "장바구니-UUID"
Invoke-RestMethod -Uri "http://localhost:3000/v1/codes/encode" -Method POST -ContentType "application/json" -Headers $headers -Body "{`"cartId`":`"$cartId`"}"

# 2. Groover Code 디코딩
Invoke-RestMethod -Uri "http://localhost:3000/v1/codes/decode" -Method POST -ContentType "application/json" -Body '{"grooverCode":"GRV1-xxxxxxxx"}'

# 3. 코드로 새 장바구니 생성
Invoke-RestMethod -Uri "http://localhost:3000/v1/codes/save" -Method POST -ContentType "application/json" -Headers $headers -Body '{"grooverCode":"GRV1-xxxxxxxx","cartName":"친구 추천"}'

# 4. 쇼핑 링크 생성
Invoke-RestMethod -Uri "http://localhost:3000/v1/codes/cart/$cartId/links" -Method GET -Headers $headers
```

## 📝 Groover Code 형식

```
GRV1-eJxNzDEOgCAQRdG9/E...AbCd1234
│  │ │                    │
│  │ │                    └─ 체크섬 (8자)
│  │ └─ Base64 인코딩된 압축 데이터
│  └─ 구분자
└─ 버전

예: GRV1-eJxNzDEOwjAMBdC7_AkJAbCd1234
```

## ✨ 기능

- ✅ 장바구니 → 코드 인코딩
- ✅ 코드 → 장바구니 디코딩
- ✅ 가격 변동 감지 & 경고
- ✅ 상품 품절 감지
- ✅ 코드로 장바구니 복원
- ✅ 쿠팡/네이버 검색 링크 생성
- ✅ 코드 사용 통계 (조회수, 저장수)
