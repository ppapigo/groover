# Groover 공개 배포 보안 수정 보고

점검일: 2026-10-20, 세션 인증 추가: 2026-10-21. 대상: 현재 로컬 작업 트리. 운영 서버·AWS·DNS·기존 Caddy·GitHub Actions Secrets는 변경하지 않았습니다.

## 1. 발견 사항과 위험도

| 위험도 | 발견 사항 | 조치 |
|---|---|---|
| 치명적: 운영 사용 시 | 공개된 개발 JWT 키와 DB 비밀번호를 운영에 사용할 수 있는 구성 | 운영 필수 환경변수, 키 형식/길이/개발값 검사, 개발 프로필 분리 |
| 높음 | 임시저장 글의 댓글 조회·댓글 작성·좋아요에 게시물 공개 상태 검사가 없음 | 서비스 계층에서 게시물 접근 권한 검사 |
| 높음 | 로그인·회원가입 속도 제한 없음 | PostgreSQL 공유 IP/계정 카운터, 429, 재시작·동시성·위조 헤더 테스트 |
| 높음 | 운영 전용 컨테이너 격리·비특권 실행·Origin 설정 부재 | 전용 Compose, 내부 네트워크, 공개 포트 제거, 운영 Origin 고정 |
| 중간 | JWT의 필수 만료/발급자/대상, 비정상 Authorization 정책이 명시되지 않음 | HS256 및 필수 클레임/헤더/사용자 검증 |
| 중간 | 같은 리뷰에 대한 동시 좋아요와 집계 변경 경쟁 | 행 잠금, 기존 복합 PK 유지 |
| 중간 | BCrypt 72바이트 상한·null 비밀번호·중첩 메타데이터 검증 부족 | 입력 검증, UTF-8 바이트 검사, 중첩 `@Valid` |
| 중간 | 존재하지 않는 계정은 비밀번호 해싱 검사 없이 즉시 실패 | 동일 오류와 dummy BCrypt 비교 |
| 중간 | logout-all이 실제 폐기 없이 성공 응답 | PostgreSQL 세션과 매 요청 유효성 검사로 개별/전체 즉시 폐기 구현 |
| 중간 | localStorage 토큰은 XSS 발생 시 탈취 가능 | access는 메모리, refresh는 HttpOnly/Secure 쿠키로 전환; CSRF 검증 및 CSP 유지 |
| 의존성별 상이 | npm 감사와 공식 권고에서 패치가 필요한 의존성 확인 | Axios/lockfile, Spring Framework/Security/Tomcat, Nginx 패치 적용 |

기존 타인 리뷰 수정·삭제와 댓글 삭제에는 소유권 검사가 이미 있었습니다. 이를 제거하지 않고 서비스 호출 시 인증 주체와 전달 사용자 일치 여부까지 확인했습니다. 실제 공격 발생이나 운영 침해를 확인했다는 의미는 아닙니다.

## 2. 수정·추가한 파일

이번 보안 작업에서 다룬 파일:

- 루트: `.gitignore`, `.gitattributes`, `.env.production.example`, `README.md`, `docker-compose.yml`, `docker-compose.production.yml`
- 배포: `deploy/Caddyfile.groover.example`, `deploy/postgres-init.sh`, `deploy/postgres-entrypoint.sh`
- 문서: `docs/API.md`, `docs/DEPLOYMENT.md`, `docs/PRODUCTION.md`, `docs/SECURITY_REVIEW.md`
- API 빌드: `groover-api/pom.xml`, `groover-api/Dockerfile`, `groover-api/.dockerignore`, `groover-api/.env.example`
- API 설정: `groover-api/src/main/resources/application.yml`, `application-dev.yml`, `db/migration/V2__auth_rate_limits.sql`, `V3__auth_sessions.sql`
- `groover-api/src/main/java/com/groover/auth/`: `AuthController.java`, `AuthDtos.java`, `AuthService.java`, `AuthSessionService.java`, `AuthCookies.java`, `JwtService.java`, `JwtAuthenticationFilter.java`, `AuthRateLimiter.java`, `AuthRateLimitFilter.java`, `ClientIpResolver.java`, `RateLimitException.java`
- `groover-api/src/main/java/com/groover/config/`: `SecurityConfig.java`, `ProductionSecurityValidator.java`, `ProductionDatabaseValidator.java`
- `groover-api/src/main/java/com/groover/common/`: `ApiExceptionHandler.java`, `SecurityResponses.java`, `HealthController.java`
- `groover-api/src/main/java/com/groover/review/`: `ReviewController.java`, `ReviewDtos.java`, `ReviewRepository.java`, `ReviewService.java`
- 사용자: `groover-api/src/main/java/com/groover/user/User.java`, `UserRepository.java`
- API 테스트: `groover-api/src/test/java/com/groover/AuthHttpTests.java`, `AuthSessionHttpTests.java`, `AuthTestSupport.java`, `SecurityHttpTests.java`, `SecurityConfigurationTests.java`, `FlywayMigrationTests.java`, `groover-api/src/test/resources/application.yml`
- 웹: `groover-web/.env.example`, `Dockerfile`, `.dockerignore`, `package.json`, `package-lock.json`, `src/lib/api.js`, `src/contexts/AuthContext.jsx`, `src/pages/ProfilePage.jsx`, `src/test/security.test.jsx`, `src/test/authApi.test.js`, `src/test/reviewFlows.test.jsx`, `src/test/setup.js`
- 웹서버: `groover-web/nginx/default.conf.template`, `nginx.conf`, `15-validate-proxy.sh`

작업 시작 전에 있던 `Review.java`의 SMALLINT 매핑, `GrooverApplicationTests.java`, `ReviewHttpTests.java`, `groover-web/README.md` 등의 로컬 변경은 보존했습니다. 테스트는 이 변경을 포함한 현재 작업 트리에서 수행했습니다. `V1__init.sql`은 수정하지 않았습니다. `target/` 아래 임시 테스트 파일은 배포 소스나 Git 추적 대상이 아닙니다.

## 3. 수정 방법

JWT 키는 CSPRNG로 생성한 최소 32바이트의 표준 Base64 형식입니다. 서명/만료/발급 시각/발급자/대상/UUID 사용자와 DB 사용자 존재를 검사하며 오류에 키나 토큰을 반환하지 않습니다. 키의 실제 난수 생성은 운영 절차로 보장해야 합니다. [JJWT 공식 키 생성 문서](https://github.com/jwtk/jjwt#secret-keys)

서비스 계층에서 작성자와 인증 주체를 검사합니다. 공개 리뷰만 익명 조회 가능하며, 임시저장 글과 댓글은 작성자에게만 허용합니다. 미인증은 401, 권한 부족은 403입니다. 리뷰 행의 비관적 잠금으로 좋아요·수정·집계를 직렬화합니다.

속도 제한은 DB에 저장하고 독립 트랜잭션으로 기록합니다. 인증 처리 중 별도 바깥 트랜잭션을 유지하지 않아 제한 카운터 연결 대기로 커넥션 풀이 고갈되는 경로를 피했습니다. 경로는 서블릿이 디코딩한 값을 사용하며 저장소 장애에는 요청을 거부합니다.

일반 API는 Bearer 인증을 유지합니다. PostgreSQL의 로그인 세션과 연결된 `sid`를 JWT에 넣고 기존 사용자 조회에 세션 상태 검사를 결합합니다. 7일 고정 만료의 refresh token은 난수로 발급해 해시만 저장하며 매번 교체합니다. 이전 토큰 재사용 시 폐기를 커밋한 다음 401을 반환해 트랜잭션 롤백으로 세션이 살아나는 문제를 방지합니다. 사용자 행 잠금으로 회전과 logout-all을 직렬화합니다.

프론트 access token은 메모리, refresh token은 HttpOnly/Secure/SameSite=Strict 쿠키에 저장합니다. 쿠키 인증 경로에는 Spring Security의 CSRF 검증을 적용하고 정확한 운영 Origin에만 credentials를 허용합니다. HTTP Basic·폼 로그인·HttpSession은 사용하지 않습니다. 사용자 HTML은 React 텍스트로 렌더링하며 Nginx CSP를 유지합니다.

운영 API/DB에는 호스트 포트가 없고 웹만 기존 프록시 네트워크에 연결됩니다. 신규 DB 초기화 시 관리자와 앱 계정을 분리하며 API가 슈퍼유저·DB/역할 생성·복제 권한으로 실행되면 거부합니다. 기존 DB 역할 변경은 수동 승인 절차입니다.

Spring Boot는 기존 3.5.6에서 같은 3.5 계열의 3.5.16으로 갱신했습니다. Spring Framework 6.2.19, Security 6.5.11, Data BOM 2025.0.13, Tomcat 10.1.61, Jackson BOM 2.21.8, PostgreSQL JDBC 42.7.14, Logback 1.5.38, Log4j BOM 2.25.5를 적용했습니다. Axios는 1.20.0, 웹서버는 Nginx 1.30.6입니다. API/웹의 Alpine 패키지를 업데이트하고 웹에서 사용하지 않는 XML·이미지·njs 모듈과 curl을 제거했습니다. [Spring Boot 보안 패치 안내](https://spring.io/blog/2026/06/10/spring-boot-3-5-15-available-now/), [Tomcat 공식 권고](https://tomcat.apache.org/security-10.html), [Axios 릴리스](https://github.com/axios/axios/releases/tag/v1.20.0), [Nginx 공식 권고](https://nginx.org/en/security_advisories.html)

## 4. 기존 기능 호환성

리뷰 CRUD, 임시저장, 발행, 검색, 댓글, 좋아요, 로그인, 이메일 인증 없는 즉시 회원가입과 사용자 UI를 유지합니다. 성공 응답 구조를 유지합니다.

의도적인 보안 동작 변경:

- 로그인 실패는 401, 권한 없는 임시저장 접근은 401/403, 요청 초과는 429입니다.
- 비정상 입력·72바이트 초과 비밀번호·잘못된 JWT를 거부합니다.
- `/auth/logout`과 `/auth/logout-all`은 실제 세션 폐기 후 200을 반환합니다. 인증 POST에는 CSRF 쿠키/헤더가 필요합니다.
- 로그인/가입 응답의 `user`, `accessToken` 구조를 유지하고 refresh token은 Set-Cookie로만 전달합니다. 새로고침 복원과 401 자동 갱신을 지원합니다.
- 운영 토큰 유효기간은 15분이고 기존 JWT 키/클레임 형식에서 전환하면 재로그인이 필요합니다.
- `dev` 프로필을 명시해야 localhost 설정과 개발 기본값을 사용할 수 있습니다.

## 5. 실행한 검증

Java 21에서 다음을 실제 실행했습니다. 테스트를 삭제하거나 실패를 건너뛰는 방식으로 통과 처리하지 않았습니다. 아래 이미지 취약점 감사 및 기존 운영 구성 점검은 10월 20일 결과이며, 세션 추가 검증은 이어지는 기록을 참고하세요.

| 검증 | 결과 |
|---|---|
| `mvn test` 전체 | 71개 성공, 실패/오류/건너뜀 0 |
| 별도 PostgreSQL 17.11에서 `SecurityHttpTests,FlywayMigrationTests` | 37개 성공, 실패/오류/건너뜀 0 |
| `npm test` | 18개 성공 |
| `npm run lint`, `npm run build` | 성공 |
| `npm audit` | 발견된 취약점 0 |
| 운영 API/웹 Docker 빌드 | Maven test/package, npm lint/test/build 포함 성공 |
| 운영 DB 시작 검사 | 약한 값·빈 값·기본값·동일 비밀번호 거부 등 7개 성공 |
| 격리된 로컬 운영 Compose HTTP 점검 | DB/API/웹 healthy, SPA/CSP, 즉시 가입, JWT, CORS, 임시저장 소유권, 발행, 댓글, 좋아요, 계정/IP 제한, 인코딩 경로·위조 IP 차단 성공 |
| 로컬 컨테이너 점검 | API/웹 non-root·읽기 전용, API 외부 포트 없음, 앱 DB 비특권, 서비스 로그에 테스트 비밀값·JWT 없음 |
| 최종 웹 이미지 Docker Scout 검사 | 26개 패키지 검사, 발견된 취약점 0 |
| 최종 API 이미지 Docker Scout 검사 | 151개 패키지 검사, Spring MVC 1개 패키지의 경고 2건 잔존(6절 참조) |
| `git diff --check` | 성공 |

Maven 실행 로그는 로컬 `groover-api/target/security-test.log`, PostgreSQL 로그는 `security-postgres-test.log`, 이미지 검사 결과는 `security-*-scout.json`에 있습니다. 이 임시 파일들은 Git에 포함하지 않습니다.

검증 범위에는 JWT 위조/만료/필수 클레임/헤더, 미인증 접근, 서비스 사용자 ID 위조, 타인 리뷰 수정·삭제·발행, 임시저장과 댓글/좋아요, 타인 댓글 삭제, BCrypt, 계정/IP 속도 제한과 동시성, 공개 조회, 운영 CORS, V1 데이터 보존 및 V2 적용, React XSS 렌더링과 빌드가 포함됩니다.

10월 21일 세션 추가 검증:

- Maven 전체 82개 성공 후 세션 저장소 장애 검증을 추가했고 해당 설정 테스트 16개가 통과했습니다. 최종 API Docker 빌드에서도 전체 83개 테스트를 포함한 `mvn package`가 성공했습니다.
- 실제 PostgreSQL 17.11의 `AuthSessionHttpTests,SecurityHttpTests,FlywayMigrationTests` 48개 성공(실패/오류/건너뜀 0).
- React 테스트 29개, lint, Vite 프로덕션 빌드 성공. 늦게 도착한 사용자 조회 응답도 로그아웃 상태를 되돌리지 못하도록 검증했습니다.
- Refresh 해시 저장, Secure/HttpOnly 쿠키, CSRF 누락/위조 및 비허용 Origin 차단, 회전/재사용 폐기, 개별/전체 로그아웃, 타인 세션 격리, 고정 만료, 같은 refresh 동시 사용, logout-all과 갱신 경쟁, 갱신 IP 제한을 실제 HTTP로 검증했습니다.
- 프론트 동시 401의 단일 갱신, 새로고침 복원, refresh 장애 시 상태 유지, 로그아웃 중 늦은 응답 차단, 다른 세션으로 쓰기 재시도 금지, 서버 로그아웃 실패 표시를 검증했습니다.
- 격리된 운영 Compose에서 Nginx를 통한 가입·CSRF·Secure/HttpOnly 쿠키 설정·refresh 회전/재사용 차단·개별/전체 즉시 폐기·SPA/CSP·비밀값 없는 로그를 확인했습니다. 쿠키 전송은 loopback HTTP 클라이언트로 모사했으며 실제 HTTPS 브라우저 테스트를 했다는 의미는 아닙니다.
- 로그: `groover-api/target/session-test.log`, `session-postgres-test.log`, `session-configuration-test.log`, `session-*-build.log`. 임시 테스트 자격 증명은 검증 후 정리합니다.

초기 실패는 새 속도 제한 때문에 공유되던 테스트 카운터와 UUID 형태 테스트 slug의 모호성에서 발생해 테스트 격리와 현실적인 slug로 수정했습니다. 읽기 전용 웹 컨테이너에서 임시 Nginx 설정 디렉터리가 없어 healthcheck가 실패한 문제는 시작 스크립트에서 디렉터리를 생성하도록 수정했습니다. PowerShell의 경고 처리 및 Docker 이미지 내보내기 캐시 문제는 실행 환경 문제로 따로 확인했습니다.

## 6. 남은 위험·미검증 사항

- 실제 Lightsail, TLS/DNS/Caddy 운영 구성, MOA와의 부하 공존, 운영 데이터 백업 복원은 검증하지 않았습니다.
- XSS가 발생하면 메모리 access token이나 열린 브라우저의 권한이 악용될 수 있습니다. 로그아웃은 이후 요청을 거부하며 이미 인증이 끝난 진행 중 요청을 취소하지는 않습니다.
- Web Locks 미지원 브라우저의 탭 간 동시 갱신, 갱신 성공 응답 유실 후 이전 토큰 재사용은 세션 폐기로 처리되어 재로그인이 필요할 수 있습니다. 실제 운영 HTTPS 브라우저·부하 검증은 별도입니다.
- 속도 제한은 분산 DDoS를 해결하지 않으며 공유 NAT 오탐 및 계정 잠금 유발 가능성이 있습니다.
- 신규 DB 앱 역할은 Flyway를 함께 실행하므로 자체 스키마 DDL 권한을 가집니다. 별도 마이그레이션 역할은 운영 개선 과제입니다.
- 외부 이미지의 사용자 추적 가능성과 Docker 관리자에게 환경변수가 보이는 특성은 남습니다.
- 키의 엔트로피를 문자열 검사만으로 증명할 수 없습니다. 운영자는 검증된 난수 생성기를 사용해야 합니다.
- 이미지 검사는 알려진 취약점 데이터베이스 기준이며 전체 보안 보증이 아닙니다. 실제 운영 DB 이미지·기존 Caddy·호스트 OS와 재빌드한 최종 이미지도 배포 전에 검사해야 합니다.
- Spring MVC 6.2.19의 `CVE-2026-47884`, `CVE-2026-47890`은 스캐너에서 Critical로 분류됐습니다. 공식 권고의 위험도는 각각 Medium/Low이고, 발생 조건은 XSLT 뷰 렌더링 및 SSE로 뷰 조각 전송입니다. 현재 앱은 JSON REST API이며 해당 타입·뷰·SSE를 사용하지 않아 **현재 코드에서는 해당 공격 경로가 확인되지 않았다는 판단**입니다. 취약 패키지 자체를 패치한 것은 아닙니다. 6.2.20 패치는 Enterprise 전용이므로 지원 계약 또는 별도 메이저 업그레이드 계획이 필요합니다. [XSLT 권고](https://spring.io/security/cve-2026-47884/), [SSE 권고](https://spring.io/security/cve-2026-47890/)

초기 이미지 검사에서는 API 38건, 웹 36건이 검출됐습니다. 의존성/OS 패치와 미사용 패키지 제거 후 API 2건, 웹 0건입니다. 잔존 경고를 숨기거나 스캐너 예외 목록에 넣지 않았습니다.

## 7. 배포 전 수동 Secrets

`POSTGRES_PASSWORD`(DB 관리자), `DATABASE_PASSWORD`(별도 앱 계정), `JWT_SECRET`이 필요합니다. 실제 값은 예시에 넣지 않았습니다. 추가로 정확한 `CADDY_PROXY_IP`, Groover 전용 `GROOVER_DB_VOLUME`, 충돌 없는 내부 네트워크/IP를 설정해야 합니다.

JWT_SECRET 교체는 기존 access token을 무효화합니다. 활성 refresh 세션은 새 access token을 발급할 수 있으므로, 전체 재로그인이 필요한 사고 대응에서는 승인된 절차로 DB 세션도 폐기해야 합니다. 기존 DB 비밀번호는 환경변수 변경만으로 바뀌지 않습니다.

## 8. 운영 Compose 실행

[운영 가이드](PRODUCTION.md)의 사전 검토와 사용자 승인을 완료한 후 실행합니다.

```bash
docker compose --env-file .env.production -f docker-compose.production.yml config --quiet
docker compose --env-file .env.production -f docker-compose.production.yml pull db
docker compose --env-file .env.production -f docker-compose.production.yml build --pull
docker compose --env-file .env.production -f docker-compose.production.yml up -d --wait
```

## 9. 실제 배포 판단

실제 배포는 수행하지 않았습니다. 코드와 로컬 운영 구성 검증은 완료했지만, 잔존 Spring 권고에 대한 위험 판단 및 운영 비밀값·기존 DB 역할/백업·볼륨·네트워크·Caddy·자원 여유 검토와 사용자 승인이 필요합니다. 실제 환경 검증 전에는 무조건 배포 가능하다고 판정하지 않습니다.
