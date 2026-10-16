# Groover

Groover는 여러 사용자의 상품 경험을 한곳에서 찾고 공유하는 리뷰 모음 서비스입니다.

## 구성

- `groover-web`: React + Vite 웹 클라이언트
- `groover-api`: Spring Boot 3 / Spring Data JPA REST API
- `docs`: 아키텍처, API, 배포 문서

리뷰 탐색·검색·작성·수정·임시저장·댓글·좋아요·회원가입·로그인을 제공합니다. 이전 DM·광고·푸시 알림과 현재 API에서 지원하지 않는 화면, Next.js 전용 코드 및 모바일 배포 스텁을 제거했습니다.

## 로컬 실행

필수 도구는 Java 21, Maven 3.9+, Node.js 20.19+ 또는 22.12+, Docker입니다.

```bash
docker compose up -d db
cd groover-api
mvn spring-boot:run
```

다른 터미널에서 웹을 실행합니다.

```bash
cd groover-web
npm ci
npm run dev
```

API 기본 주소는 `http://localhost:3000/v1`, 웹 기본 주소는 `http://localhost:3001`입니다. 웹 환경변수 `VITE_API_URL`로 API 주소를 바꿀 수 있습니다.

## 테스트

```bash
cd groover-api
mvn test
```

테스트는 별도 PostgreSQL 없이 H2의 PostgreSQL 호환 모드를 사용합니다.

웹 검증은 다음 명령으로 실행합니다.

```bash
cd groover-web
npm run lint
npm test
npm run build
```

자세한 내용은 [아키텍처](docs/ARCHITECTURE.md), [API](docs/API.md), [배포](docs/DEPLOYMENT.md)를 참고하세요.
