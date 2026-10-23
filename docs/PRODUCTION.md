# Groover 운영 배포

Java 21 / Spring Boot 3.5 계열 / PostgreSQL 17 / Flyway / React(Vite)를 유지합니다.
기존 Spring Boot 3.5.6은 보안 패치를 위해 3.5.16으로 갱신했습니다.
`docker-compose.yml`은 로컬 개발용이고, `docker-compose.production.yml`은 Lightsail용 독립 구성입니다.
이 문서는 배포 준비 절차입니다. 서버·AWS·DNS·기존 Caddy·GitHub Actions Secrets 변경과 실제 배포는 별도 사용자 승인 후 진행합니다.

## 네트워크와 자원

경로: Internet → 기존 Caddy(HTTPS) → `groover-web:8080` → `api:3000/v1` → PostgreSQL.

- 운영 Compose 프로젝트명은 `groover-prod`. 호스트에 공개하는 포트는 없습니다.
- 기존 외부 `proxy-net`에는 `web`만 연결합니다. 기존 MOA 서비스·네트워크·볼륨 정의는 수정하지 않습니다.
- `application`, `database`는 Groover 전용 내부 네트워크입니다. DB는 `database`에만 연결합니다.
- API(UID 10001), 웹(UID 101)은 비특권 사용자, 읽기 전용 루트 파일시스템, tmpfs, 모든 capability 제거로 실행합니다.
- PostgreSQL 공식 이미지의 초기화 프로세스는 볼륨 소유권 설정 후 postgres 사용자로 전환합니다. 기존 볼륨 권한을 임의 변경하지 마세요.
- 메모리 상한은 API 1536MB, DB 1GB, 웹 128MB입니다. 8GB 서버에서 MOA·Caddy·OS의 현재 사용량을 먼저 확인하세요. 이 값은 부하 테스트 결과가 아닙니다.
- Docker 로그는 서비스별 10MB × 3개로 회전합니다. Nginx 접근 로그에는 쿼리·Authorization·요청 본문을 기록하지 않습니다.
- API/웹 healthcheck, DB `pg_isready`, 시작 의존성이 설정되어 있습니다. `/v1/health`는 애플리케이션 준비 상태이며 지속적인 DB 가용성 검사는 별도 모니터링이 필요합니다.

## 승인 전에 준비할 값

루트의 `.env.production.example`은 변수 이름만 제공합니다. 운영 서버에서 복사 후 값을 채우고 `chmod 600 .env.production`을 적용합니다. 실제 값은 Git, 채팅, 명령 결과, CI 로그에 올리지 않습니다.

| 변수 | 의미 |
|---|---|
| `POSTGRES_PASSWORD` | 새 DB 초기화용 `groover_admin` 관리자 비밀번호. 최소 32바이트 난수 권장 |
| `DATABASE_PASSWORD` | API/Flyway용 `groover` 계정 비밀번호. 관리자와 다른 난수 사용. 최소 24자 및 기본값 검사 |
| `JWT_SECRET` | CSPRNG로 생성한 최소 32바이트 키의 표준 Base64 문자열. 권장 64바이트 |
| `CADDY_PROXY_IP` | 기존 `proxy-net`에서 Caddy 컨테이너의 정확한 IPv4 주소. CIDR·전체 대역 금지 |
| `GROOVER_DB_VOLUME` | 검토한 Groover 전용 기존 named volume 이름. MOA 볼륨 지정 금지 |
| `GROOVER_APP_SUBNET` | 기존 Docker/VPC 대역과 겹치지 않는 전용 대역. 기본 `172.31.240.0/24` |
| `GROOVER_WEB_INTERNAL_IP` | 위 대역의 웹 고정 IPv4. 기본 `172.31.240.10` |

난수 생성은 `openssl rand -base64 64`(JWT), `openssl rand -hex 32`(각 DB 비밀번호) 등을 사용합니다. 생성 결과를 비밀값 파일/비밀 관리 도구에 직접 저장하고 공유 로그에 출력하지 마세요. Base64는 암호화가 아닙니다. 실행 시 길이·반복값·알려진 개발값을 검사하지만 난수 생성 과정을 코드가 증명할 수는 없습니다.

Compose는 `prod` 프로필, PostgreSQL, `ddl-auto=validate`, Flyway를 사용합니다. 누락된 필수 변수, 약한 키/비밀번호, 개발 CORS, 자동 DDL 변경, 과도한 DB 계정 권한은 실행 오류로 처리합니다. DB 시작 스크립트도 관리자·앱 비밀번호의 빈 값·기본값·길이·반복값을 검사하고 두 비밀번호가 같으면 거부합니다. `prod`와 `dev`를 함께 사용하지 마세요.

## 기존 데이터와 권한 보존

1. **대상 Groover DB와 볼륨을 식별**하고 백업 및 별도 DB 복원 검증을 수행합니다. 실제 운영 데이터로 테스트를 실행하지 마세요.
2. 운영 볼륨은 `external: true`입니다. 존재하지 않는 볼륨이면 Compose가 실패합니다. 처음 배포하는 경우에만 승인받고 새 Groover 전용 볼륨을 생성하세요.
3. 새 빈 볼륨에서는 `deploy/postgres-init.sh`가 `groover_admin`과 별도로 `groover` 비특권 로그인 역할을 구성합니다. API에는 관리자 비밀번호를 전달하지 않습니다.
4. **기존 볼륨에서는 초기화 스크립트가 실행되지 않습니다.** 환경변수 변경만으로 저장된 비밀번호가 바뀌지 않습니다. 기존 관리자 접근을 확보한 뒤 `pg_roles`에서 `rolsuper`, `rolcreatedb`, `rolcreaterole`, `rolreplication`을 확인하세요. API 계정의 과도한 권한은 별도 관리자 계정을 확보하고 승인된 절차로 제거해야 합니다.
5. 기존 앱 역할이 따로 있다면 DB 관리자와 검토하여 테이블·Flyway 이력 소유권 및 DDL 권한을 조정합니다. 런타임과 Flyway 역할의 완전한 분리는 추가 개선 사항입니다. 새 API 역할은 자체 테이블을 소유하므로 스키마 내 DDL 권한이 있습니다.
6. 기존 `V1__init.sql`, `V2__auth_rate_limits.sql`은 수정하지 않습니다. V2는 속도 제한 테이블을, `V3__auth_sessions.sql`은 세션 및 refresh token 해시 이력 테이블을 추가합니다. 사용자·리뷰·댓글 데이터는 삭제하거나 재작성하지 않습니다.
7. Flyway 이력이 없거나 checksum 불일치가 있으면 중단하고 조사하세요. `baseline`, `repair`, `clean`, `ddl-auto=update`를 임의 실행하지 마세요. `docker compose down -v`, volume prune, 운영 DB 초기화도 금지합니다.

## Caddy의 실제 IP와 TLS

`deploy/Caddyfile.groover.example`은 승인 후 기존 Caddyfile에 **이 사이트 블록만** 병합하기 위한 예시입니다. 기존 파일을 통째로 덮어쓰지 마세요.

Caddy가 인터넷에 직접 연결된 구성에서 `X-Forwarded-For`를 `{remote_host}`로 덮어씁니다. 웹은 `CADDY_PROXY_IP`에서 온 요청만 신뢰하고 API에 클라이언트 IP 하나로 헤더를 다시 작성합니다. API는 `GROOVER_WEB_INTERNAL_IP`에서 전달한 단일 IP만 신뢰합니다. 일반 클라이언트의 `Forwarded`, `X-Real-IP`, 여러 IP가 든 헤더는 신뢰하지 않습니다.

Caddy IP가 재생성으로 바뀌면 설정도 검토해야 합니다. Cloudflare/CDN/LB가 앞에 있으면 이 예시를 그대로 적용하지 마세요. 검증된 프록시 IP와 원본 IP 정책을 Caddy에서 설정하고 위조 헤더 테스트를 다시 실행해야 합니다. 전체 사설 대역을 신뢰하지 않습니다. [Caddy 공식 문서](https://caddyserver.com/docs/caddyfile/directives/reverse_proxy)

TLS와 HSTS는 Caddy 사이트 블록에서 처리합니다. 기존 인증서 볼륨·포트·네트워크를 변경하지 않습니다.

## 인증과 브라우저

- 회원가입은 이메일 인증 없이 바로 계정을 생성하고 JWT를 반환합니다.
- 운영 Origin은 `https://groover.grooverapp.com` 하나이며 인증 쿠키를 위해 credentials를 허용합니다. 개발 `localhost:3001`은 `dev` 설정에만 있습니다.
- JWT는 HS256 서명/발급자/대상/만료/발급 시각/사용자 및 `sid` 세션 상태를 검사합니다. 운영 access token 유효기간은 15분, DB 로그인 세션은 7일(고정 만료)입니다.
- **JWT_SECRET 교체는 이전 access token을 무효화합니다.** Refresh token은 DB 세션으로 관리되므로 계속 갱신할 수 있습니다. 키 유출 대응으로 전체 재로그인이 필요하면 별도 승인 절차로 모든 DB 세션도 폐기해야 합니다. `sid`가 없는 이전 클라이언트 토큰은 전환 시 재로그인이 필요합니다.
- Access token은 프론트 메모리에만 보관하며 이전 localStorage 값을 제거합니다. 새로고침 시 HttpOnly refresh 쿠키로 세션을 복원합니다. 운영 쿠키는 `__Host-` 접두사, Secure, SameSite=Strict, Path=/, Domain 없음입니다.
- Refresh token은 32바이트 난수의 해시만 DB에 저장하고 사용할 때마다 교체합니다. 사용한 토큰의 재사용을 감지하면 해당 세션 전체를 폐기합니다. 사용자 행 잠금으로 갱신과 전체 로그아웃을 직렬화하며, 만료 세션과 해시 이력은 매시간 정리합니다.
- `/auth/logout`은 현재 세션, `/auth/logout-all`은 사용자의 모든 세션을 폐기합니다. 이후 들어오는 access/refresh token 요청은 401입니다. 이미 인증을 마친 진행 중 요청을 소급 취소하지는 않습니다.
- 일반 API는 Bearer만 인증에 사용합니다. 로그인/가입/refresh/logout/logout-all에는 Spring Security CSRF 쿠키와 `X-CSRF-TOKEN` 검증을 적용합니다. HttpOnly CSRF 쿠키의 마스킹된 토큰은 `/auth/csrf` 응답에서 읽습니다. HTTP Basic·폼 로그인·HttpSession은 사용하지 않습니다. [Spring Security CSRF 문서](https://docs.spring.io/spring-security/reference/6.5/servlet/exploits/csrf.html)
- 프론트는 동시 401 갱신을 합치고 Web Locks 지원 브라우저에서는 탭 간 인증 요청도 직렬화합니다. BroadcastChannel로 로그인/로그아웃 변경을 다른 탭에 알립니다. 해당 기능 미지원 브라우저의 탭 간 갱신 경쟁 또는 응답 유실 후 재사용은 안전하게 세션 폐기와 재로그인으로 처리됩니다. 재사용 허용 유예는 두지 않습니다.
- HttpOnly가 XSS 자체를 막지는 않습니다. XSS가 발생하면 열린 페이지에서 요청을 실행하거나 메모리의 access token을 읽을 수 있습니다. escaping/CSP 방어를 유지합니다. DB 장애 시 인증·갱신은 503으로 거부하며, 로그아웃 실패를 성공으로 표시하지 않습니다.
- 운영 웹 `VITE_API_URL=/v1`은 공개 빌드 설정입니다. `VITE_` 변수에 비밀번호·JWT 키·AWS 키를 넣지 마세요. 주소 변경은 재빌드가 필요합니다.
- CSP는 같은 Origin의 스크립트·스타일·API만 허용합니다. 외부 스크립트/폰트 추가 시 정책과 브라우저 검증을 갱신하세요. 외부 이미지의 추적 위험은 남습니다.

## 속도 제한

로그인 시도(성공 포함)는 IP별 15분 60회, 계정별 15분 10회입니다. 같은 실제 계정의 이메일/아이디는 한 계정 카운터를 공유합니다. 회원가입은 IP별 15분 10회, 이메일/아이디별 각각 15분 3회입니다. Refresh는 IP별 15분 120회입니다. 429와 `Retry-After`를 반환합니다.

PostgreSQL의 시간 구간 카운터와 64개 잠금 행을 사용합니다. 실패한 인증 트랜잭션과 별도로 시도 횟수를 커밋하며 재시작·다중 인스턴스에서도 공유합니다. 하루 지난 카운터는 매시간 정리합니다. DB 실패 시 503으로 요청을 거부합니다.

공유 NAT 오탐, 계정 식별자를 아는 공격자의 일시적 잠금 유발, 분산 봇넷·대량 연결·느린 본문 전송까지 해결하지는 않습니다. 앞단 모니터링·DDoS 대응과 트래픽에 따른 한도 조정이 필요합니다. 서버에 적용한 설정은 아닙니다.

## 검증과 실행 순서

먼저 개발 PC/검증 환경에서:

```bash
cd groover-api
mvn test
cd ../groover-web
npm ci --include=dev
npm run lint
npm test
npm run build
npm audit
cd ..
```

실제 PostgreSQL 검증은 **별도의 폐기 가능한 테스트 DB만** 사용합니다:

```bash
# GROOVER_TEST_DB_PASSWORD는 테스트 DB 비밀번호를 환경변수로 주입
cd groover-api
mvn -Dtest=AuthSessionHttpTests,SecurityHttpTests,FlywayMigrationTests \
  -Dsecurity.test.database-url=jdbc:postgresql://127.0.0.1:TEST_PORT/security_test \
  -Dsecurity.test.database-user=postgres test
```

운영 승인 후 백업·복원·DB 역할·비밀값·네트워크·Caddy IP 검토를 끝낸 상태에서:

```bash
docker compose --env-file .env.production -f docker-compose.production.yml config --quiet
docker compose --env-file .env.production -f docker-compose.production.yml pull db
docker compose --env-file .env.production -f docker-compose.production.yml build --pull
docker compose --env-file .env.production -f docker-compose.production.yml up -d --wait
docker compose --env-file .env.production -f docker-compose.production.yml ps
```

`config`를 `--quiet` 없이 실행하면 비밀값을 출력할 수 있습니다. Docker 접근 권한자는 컨테이너 환경변수를 열람할 수 있으므로 서버/Docker 그룹 접근을 제한하세요.

빌드 과정도 테스트를 실행합니다. 실패를 건너뛰어 배포하지 않습니다. 빌드는 자원을 많이 사용하므로 MOA와 공유하는 서버에서는 검증된 이미지를 CI/별도 머신에서 만드는 것을 권장합니다. 이 작업에서 registry나 CI Secrets는 설정하지 않았습니다.

이미지는 OS 보안 업데이트를 적용하고 웹의 사용하지 않는 XML·이미지·njs 모듈과 curl을 제거합니다. 재빌드 시점에 따라 패키지가 달라질 수 있으므로 배포할 이미지 자체를 다시 검사하고 검증된 digest를 기록하세요. Spring 6.2에서 공개 패치가 제공되지 않는 권고와 현재 코드의 영향 여부는 [보안 보고서](SECURITY_REVIEW.md)를 확인하세요.

최종 승인 후 Caddy 설정을 검증·reload하고 실제 HTTPS에서 회원가입/로그인/리뷰 CRUD/임시저장/발행/검색/댓글/좋아요, SPA 새로고침, CORS, 잘못된 토큰, 위조 IP, 429, 백업 복원을 확인합니다. 기존 MOA 접근과 자원 사용량도 확인해야 합니다.

## 개발 환경

`docker compose up -d --wait db` 후 API는 명시적으로 개발 프로필을 사용합니다:

```bash
cd groover-api
mvn spring-boot:run -Dspring-boot.run.profiles=dev
```

개발 기본 DB는 `localhost:5433`, 계정/비밀번호는 개발 Compose의 `groover`입니다. `.env`는 선택 사항이며 빈 변수는 삭제하거나 필요한 값을 채우세요. 이전 `.env`의 일반 문자열 JWT 키는 제거(개발 재시작마다 임시 키 생성)하거나 새 Base64 난수 키로 교체해야 합니다. 빈 `.env.example`을 그대로 복사하면 DB 연결에 실패할 수 있습니다.


## 서브도메인 전환 및 배포 판정

운영 Origin은 `https://groover.grooverapp.com`입니다. main push는 독립 배포 workflow를 시작하므로 병합 전에 서버 상태를 확인합니다.

- 기존 Caddyfile 전체를 예제로 덮어쓰지 않습니다. Groover 사이트 블록만 검토하고 MOA, AChat, 루트 도메인 라우팅을 보존합니다. 실제 설정에 `caddy validate`를 실행한 후 reload합니다.
- DNS A/AAAA, HTTPS 인증서, `proxy-net`의 `groover-web` 별칭, 실제 Caddy IP와 `CADDY_PROXY_IP`, 웹 내부 IP와 `TRUSTED_PROXY_IPS` 일치를 확인합니다.
- 기존 Groover 외부 DB 볼륨과 백업/복원 가능성, 서버 메모리/디스크 여유를 확인합니다. DB, Redis, Caddy를 재생성하거나 `down -v`를 실행하지 않습니다.
- `deploy-guard.sh`는 API/웹 컨테이너 health와 공개 웹의 HTTP 200 및 Groover title, `/v1/health`의 HTTP 200 및 `{"status":"UP"}`을 검사합니다. 리다이렉트는 따라가지 않습니다. 웹 title 변경 시 검증과 fixture도 함께 갱신합니다.
- health 응답은 DB 가용성을 보장하지 않습니다. 배포 이후 DB를 사용하는 피드/검색을 확인하고 로그인 → 새로고침 → refresh → 로그아웃을 브라우저에서 검증합니다.
- 쿠키는 `__Host-` 이름, Secure, HttpOnly, SameSite=Strict, Path=/, Domain 없음을 유지합니다. 루트 도메인의 host-only 쿠키는 이전되지 않아 재로그인이 필요할 수 있습니다.
- 새 Origin과 X-CSRF-TOKEN preflight는 허용하고 루트/MOA/AChat/외부 Origin은 거부합니다. CSRF 없는 인증 POST는 거부되어야 합니다.
- 배포 전후 MOA/AChat 화면·인증·채팅을 비교합니다. 기존 라우팅과 컨테이너/볼륨을 보존합니다.
- 실패 시 이전 API/웹 이미지로 복구하고 같은 공개 URL 검사를 반복합니다. DB migration은 이미지 롤백으로 되돌아가지 않습니다. 이전 이미지도 공개 검사에 실패하면 복구 완료로 판단하지 않습니다.
