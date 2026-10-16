# 배포 가이드

## 환경변수

| 이름 | 필수 | 기본값/설명 |
|---|---:|---|
| `DATABASE_URL` | 운영 필수 | PostgreSQL JDBC URL |
| `DATABASE_USERNAME` | 운영 필수 | DB 계정 |
| `DATABASE_PASSWORD` | 운영 필수 | DB 비밀번호 |
| `JWT_SECRET` | 운영 필수 | 32바이트 이상의 임의 문자열 |
| `CORS_ALLOWED_ORIGINS` | 권장 | 쉼표로 구분한 웹 Origin |
| `PORT` | - | `3000` |
| `VITE_API_URL` | 웹 필수 | 외부 API URL + `/v1` |

운영에서는 소스의 기본 비밀번호와 JWT 개발 키를 사용하지 마세요.

## 컨테이너 실행

```bash
docker compose up --build -d
docker compose logs -f api
```

API 시작 시 Flyway가 스키마를 자동 적용합니다. JPA는 `ddl-auto=validate`로 매핑과 실제 스키마의 일치 여부만 검사합니다.

## 배포 전 확인

```bash
cd groover-api
mvn test
mvn package

cd ../groover-web
npm ci
npm run lint
npm test
npm run build
```

TLS는 리버스 프록시나 클라우드 로드밸런서에서 종료하고, PostgreSQL은 외부에 직접 공개하지 않는 구성을 권장합니다.

## React 웹 배포

Node.js 20.19+ 또는 22.12+에서 `groover-web`을 빌드하고 `dist/`를 정적 서버에 배포합니다. `VITE_API_URL`은 브라우저에서 접근할 API 주소이며 빌드 시 번들에 포함됩니다. 변경 후에는 재빌드가 필요합니다. `CORS_ALLOWED_ORIGINS`에는 실제 웹 Origin을 설정하세요.

SPA 주소로 직접 접근하거나 새로고침해도 열리도록 fallback을 설정합니다. Nginx 예시:

```nginx
server {
    listen 80;
    root /usr/share/nginx/html;
    index index.html;
    location /assets/ { try_files $uri =404; }
    location = /sw.js { add_header Cache-Control "no-cache"; }
    location / { try_files $uri $uri/ /index.html; }
}
```

`public/_redirects`를 사용하는 정적 호스팅에는 fallback 설정이 함께 복사됩니다. `npm run preview`는 로컬 빌드 확인용입니다. Compose 구성은 PostgreSQL과 API만 실행합니다.

기존 서비스 워커가 있던 Origin에서는 전환용 `sw.js`도 배포해야 오래된 PWA 캐시가 제거됩니다.
