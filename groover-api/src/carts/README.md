# 🛒 Carts Module

## 📁 파일 구조

```
src/carts/
├── carts.module.ts
├── carts.controller.ts
├── carts.service.ts
└── dto/
    ├── create-cart.dto.ts
    ├── update-cart.dto.ts
    ├── add-item.dto.ts
    └── update-item.dto.ts
```

## 🔧 설치

`src/carts/` 폴더를 `C:\dev\groover\groover-api\src\carts\`에 복사 (덮어쓰기)

## 📡 API 엔드포인트

| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | /v1/carts | 장바구니 생성 |
| GET | /v1/carts | 내 장바구니 목록 |
| GET | /v1/carts/:id | 장바구니 상세 |
| GET | /v1/carts/code/:code | Groover Code로 조회 |
| PATCH | /v1/carts/:id | 장바구니 수정 |
| DELETE | /v1/carts/:id | 장바구니 삭제 |
| POST | /v1/carts/:id/items | 상품 추가 |
| PATCH | /v1/carts/:cartId/items/:itemId | 수량 수정 |
| DELETE | /v1/carts/:cartId/items/:itemId | 상품 삭제 |
| DELETE | /v1/carts/:id/clear | 장바구니 비우기 |
| PATCH | /v1/carts/:id/public | 공개 설정 |

## 🧪 테스트

```powershell
# 로그인
$login = Invoke-RestMethod -Uri "http://localhost:3000/v1/auth/login" -Method POST -ContentType "application/json" -Body '{"email":"test@groover.com","password":"password123"}'
$token = $login.accessToken
$headers = @{ Authorization = "Bearer $token" }

# 장바구니 생성
Invoke-RestMethod -Uri "http://localhost:3000/v1/carts" -Method POST -ContentType "application/json" -Headers $headers -Body '{"name":"이번주 장보기","budget":100000}'

# 장바구니 목록 조회
Invoke-RestMethod -Uri "http://localhost:3000/v1/carts" -Method GET -Headers $headers

# 상품 추가 (productId는 실제 상품 ID로 교체)
Invoke-RestMethod -Uri "http://localhost:3000/v1/carts/{cartId}/items" -Method POST -ContentType "application/json" -Headers $headers -Body '{"productId":"상품UUID","quantity":2}'
```
