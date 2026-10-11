# 아키텍처

```text
Next.js Web
    │ HTTPS / JSON + Bearer JWT
    ▼
Spring Boot API
    ├─ auth    회원가입, 로그인, JWT 인증
    ├─ review  리뷰, 댓글, 좋아요
    └─ search  제목·본문·상품명·태그 검색
    │
    ▼
Spring Data JPA + PostgreSQL
```

## 백엔드 원칙

- Controller는 HTTP 계약과 검증을 담당합니다.
- Service는 트랜잭션과 소유권 검사 등 유스케이스를 담당합니다.
- Repository는 Spring Data JPA로 영속성을 담당합니다.
- 엔티티 연관은 지연 로딩을 기본으로 하고 조회 시 `EntityGraph`를 사용합니다.
- 스키마 변경은 `src/main/resources/db/migration`의 Flyway SQL로 관리합니다.
- 인증은 서버 세션 없는 Bearer JWT 방식입니다.

## 핵심 데이터 모델

- `users`: 로그인 계정과 공개 프로필
- `reviews`: 상품 리뷰 본문, 평점, 가격, 구매 상태, 집계값
- `review_tags`: 리뷰별 태그
- `review_likes`: 사용자와 리뷰의 좋아요 관계
- `comments`: 리뷰 댓글

광고 거래, 에스크로, DM, 푸시 알림, AI 추천 기능은 리뷰 모음의 핵심 범위에서 제외했습니다. 최신/인기 피드는 명시적인 정렬 기준으로 제공하며 AI 모델을 호출하지 않습니다.
