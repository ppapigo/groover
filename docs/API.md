# Groover API 명세서

## Base URL
```
https://api.groover.app/v1
```

## 인증

모든 API는 JWT 토큰 인증이 필요합니다.
```
Authorization: Bearer {token}
```

## 엔드포인트

### POST /auth/register
회원가입

### POST /recommendations/generate
AI 장바구니 추천 생성

### GET /products/search
상품 검색

(자세한 내용은 개발하면서 추가)
