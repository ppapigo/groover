# 아키텍처

```text
React + Vite SPA (React Router / TanStack Query)
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
- 요청·응답 DTO는 도메인별 `dto` 패키지의 개별 파일로 관리하고, 컨트롤러는 구체적인 응답 타입을 명시합니다.
- 같은 필드·검증 규칙은 DTO를 공유하되 필수 여부, 검증, 기본값, 공개 범위 등이 달라지면 용도별 DTO를 새로 만듭니다. 상세 기준은 [API DTO 규칙](../groover-api/AGENTS.md)을 따릅니다.
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

## 웹 구성

- `src/main.jsx`: React 루트와 공통 Provider
- `src/App.jsx`: 공개 라우트와 인증이 필요한 라우트
- `src/pages`: 홈, 리뷰 탐색·상세·작성, 검색, 인증, 내 기록
- `src/components/review`: 리뷰 카드, 본문 이미지 렌더링, 댓글
- `src/lib/api.js`: API 주소 및 Bearer JWT 처리
- `src/lib/reviewApi.js`: Spring 리뷰 API 요청·응답 계약
- TanStack Query는 조회 상태, 취소, 캐시 무효화와 커서 페이지 처리를 담당합니다. 인증 상태 변경 시 사용자별 캐시를 비웁니다.

웹은 정적 SPA이며 서버 렌더링이나 프레임워크 서버 없이 배포합니다. 기존 `/blog` 주소와 Spring API 경로는 유지합니다.
