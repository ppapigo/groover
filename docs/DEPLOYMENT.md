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
| `NEXT_PUBLIC_API_URL` | 웹 필수 | 외부 API URL + `/v1` |

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
npm run build
```

TLS는 리버스 프록시나 클라우드 로드밸런서에서 종료하고, PostgreSQL은 외부에 직접 공개하지 않는 구성을 권장합니다.
