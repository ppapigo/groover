# Groover

Groover는 여러 사용자의 상품 경험을 한곳에서 찾고 공유하는 리뷰 모음 서비스입니다.

## 구성

- `groover-web`: React + Vite 웹 클라이언트
- `groover-api`: Spring Boot 3 / Spring Data JPA REST API
- `docs`: 아키텍처, API, 배포 문서

리뷰 탐색·검색·작성·수정·임시저장·댓글·좋아요·회원가입·로그인을 제공합니다. 이전 DM·광고·푸시 알림과 현재 API에서 지원하지 않는 화면, Next.js 전용 코드 및 모바일 배포 스텁을 제거했습니다.

## 로컬 실행

필수 도구는 Java 21, Maven 3.9+, Node.js 20.19+ 또는 22.12+, Docker입니다.

아래 명령은 각각 저장소 루트(`groover`)에서 시작합니다. DB 명령을 실행하기 전에 Docker Desktop을 먼저 켜주세요.

```bash
docker compose up -d --wait db
cd groover-api
mvn spring-boot:run -Dspring-boot.run.profiles=dev
```

개발 프로필은 로컬 DB 기본값과 임시 JWT 키를 제공합니다. `.env`는 선택 사항이며 예시 파일에는 변수 이름만 있습니다. 기존 파일을 덮어쓰지 말고 빈 DB 변수는 삭제하거나 값을 채우세요. 예전 일반 문자열 `JWT_SECRET`은 제거하거나 Base64 난수 키로 교체해야 합니다. `.env` 값에는 따옴표를 붙이지 마세요.

Docker DB는 로컬 `5433` 포트를 사용합니다. PC에 별도로 설치된 PostgreSQL의 기본 포트 `5432`와 충돌하지 않도록 분리했습니다. API는 `.env`가 있는 `groover-api` 폴더에서 실행하세요. IntelliJ 실행 설정의 Working directory도 `$PROJECT_DIR$/groover-api`로 지정합니다.

다른 터미널에서 웹을 실행합니다.

```bash
cd groover-web
npm ci --include=dev
npm run dev
```

`npm ci --include=dev`가 성공한 뒤 `npm run dev`를 실행하세요. Vite는 개발 의존성이므로 함께 설치해야 합니다. 이미 웹 개발 서버가 실행 중이라면 해당 터미널에서 `Ctrl+C`로 종료한 다음 의존성을 설치하세요. 특히 Windows에서는 실행 중인 서버가 설치 파일을 잠글 수 있습니다.

API 기본 주소는 `http://localhost:3000/v1`, 웹 기본 주소는 `http://localhost:3001`입니다. 웹 환경변수 `VITE_API_URL`로 API 주소를 바꿀 수 있습니다.

### DB 연결 문제 해결

- **`Connection refused`**: Docker Desktop을 켠 뒤 저장소 루트에서 `docker compose up -d --wait db`를 실행하세요. `docker compose ps`에서 DB가 `healthy`이고 `127.0.0.1:5433->5432/tcp`로 표시되는지 확인합니다.
- **`password authentication failed for user "groover"`**: 로컬 API의 `.env`에 포트 `5433`, 계정·비밀번호 `groover`가 설정되어 있는지 확인하세요. 포트 `5432`는 PC에 설치된 다른 PostgreSQL로 연결될 수 있습니다. 기존 Docker 볼륨은 컨테이너를 다시 생성해도 저장된 비밀번호가 바뀌지 않으므로, 계속 실패하면 아래 명령으로 개발 DB 계정의 비밀번호를 Compose 설정에 맞춥니다.
- **DB 비밀번호가 비어 있거나 `JWT_SECRET`을 찾지 못함**: `groover-api/.env` 파일과 API 실행 폴더를 확인하세요. OS 또는 IntelliJ에 지정한 환경변수가 있다면 `.env`보다 우선 적용됩니다.

```bash
docker compose exec db psql -U groover -d groover -c "ALTER ROLE groover WITH PASSWORD 'groover';"
```

Compose로 API까지 실행할 때는 컨테이너 내부 주소 `jdbc:postgresql://db:5432/groover`를 사용합니다. DB 포트 변경 후에는 위 `docker compose up` 명령으로 컨테이너를 다시 생성하면 기존 볼륨의 데이터가 유지됩니다.

### 웹 실행 문제 해결

- **`vite`를 찾을 수 없음**: `groover-web` 폴더에서 `npm ci --include=dev`를 다시 실행하고 설치 성공 여부를 확인하세요. 설치가 실패했다면 `npm run dev` 대신 설치 오류부터 해결해야 합니다.
- **`Port 3001 is already in use`**: 이미 실행 중인 웹 서버가 있습니다. `http://localhost:3001`을 열거나 기존 서버를 종료한 뒤 다시 실행하세요.
- **화면은 열리지만 리뷰 조회·로그인이 실패함**: `npm run dev`는 웹만 실행합니다. DB와 API도 위 명령으로 실행해야 합니다.

## 테스트

```bash
cd groover-api
mvn test
```

테스트는 별도 PostgreSQL 없이 H2의 PostgreSQL 호환 모드를 사용합니다. 실제 Flyway 마이그레이션을 적용하고 JPA 매핑을 검증합니다.

웹 검증은 다음 명령으로 실행합니다.

```bash
cd groover-web
npm run lint
npm test
npm run build
```

자세한 내용은 [아키텍처](docs/ARCHITECTURE.md), [API](docs/API.md), [운영 배포](docs/PRODUCTION.md), [배포](docs/DEPLOYMENT.md)를 참고하세요.
