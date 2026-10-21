# API

기본 경로는 `/v1`입니다. 응답은 원칙적으로 `{ "success": true, "data": ... }` 형태이며 인증 API에서 받은 토큰을 `Authorization: Bearer <token>`으로 전달합니다.

## 인증

| Method | Path | 인증 | 설명 |
|---|---|---:|---|
| POST | `/auth/register` | - | 회원가입 및 토큰 발급 |
| POST | `/auth/login` | - | 이메일 또는 아이디 로그인 |
| GET | `/auth/csrf` | - | CSRF 쿠키 설정, `data.token` 반환 |
| POST | `/auth/refresh` | Refresh 쿠키 | access token 갱신 및 refresh token 회전 |
| GET | `/auth/me` | 필요 | 내 정보 |
| POST | `/auth/logout` | Bearer 또는 Refresh 쿠키 | 현재 로그인 세션 즉시 폐기 |
| POST | `/auth/logout-all` | Bearer 필요 | 사용자의 모든 로그인 세션 즉시 폐기 |

Access JWT 유효기간은 운영 15분입니다. 모든 인증 요청에서 `sub`/`sid`에 연결된 DB 사용자와 유효한 세션을 한 조회로 확인합니다. 로그아웃의 DB 커밋 후 들어온 기존 access/refresh token 요청은 401입니다. 이미 인증 검사를 통과한 진행 중 요청까지 취소하지는 않습니다.

위 인증 POST 경로는 모두 CSRF 검증을 요구합니다. 먼저 `/auth/csrf`를 호출해 쿠키를 보관하고 `data.token`을 `X-CSRF-TOKEN` 헤더에 넣습니다. 브라우저의 인증 요청은 `withCredentials: true`를 사용합니다. CSRF 누락/오류는 403이며 일반 리뷰 API는 계속 명시적 Bearer로 인증합니다.

로그인/가입/갱신의 JSON `data`는 기존과 같은 `{ user, accessToken }`입니다. Refresh token은 JSON에 포함하지 않고 운영 `__Host-groover-refresh` 쿠키(`HttpOnly; Secure; SameSite=Strict; Path=/`, Domain 없음)에만 설정합니다. 개발 프로필에서는 HTTP localhost를 위해 `groover-refresh` 이름과 Secure=false를 사용합니다. CSRF 쿠키도 HttpOnly이며 `/auth/csrf` 응답에서 마스킹된 토큰을 읽습니다.

Refresh token은 32바이트 난수이고 DB에 SHA-256 해시만 저장합니다. 세션은 로그인부터 최대 7일이며 갱신해도 연장되지 않습니다. 갱신은 이전 토큰을 사용 처리하고 새 토큰을 발급합니다. 이전 토큰 재사용 시 해당 세션 전체를 폐기하므로 새로 받은 access token도 거부됩니다. 클라이언트는 동시 갱신을 합쳐야 합니다. 로그인/가입/갱신의 IP 제한 초과는 429와 `Retry-After`를 반환합니다.

회원가입 본문 예시:

```json
{"userId":"reviewer01","email":"reviewer@example.com","password":"password123","name":"리뷰어"}
```

회원가입은 이메일 인증 코드나 인증 링크 확인 없이 즉시 완료됩니다. 성공 응답의 `data`에는 `user`와 `accessToken`이 포함되며, 프론트엔드는 이 토큰으로 바로 로그인 상태를 적용합니다. 가입 후 별도 로그인 없이 내 정보 조회와 리뷰 작성이 가능합니다. 이메일 형식 및 이메일·아이디 중복 검사는 유지합니다.

## 리뷰

| Method | Path | 인증 | 설명 |
|---|---|---:|---|
| GET | `/blog/feed?cursor=0&limit=20` | - | 최신 공개 리뷰 |
| GET | `/blog/feed/popular?cursor=0&limit=20` | - | 좋아요·조회수 순 리뷰 |
| GET | `/blog/feed/tag/{tag}?cursor=0&limit=20` | - | 태그별 최신 공개 리뷰 |
| GET | `/blog/posts/{slug-or-id}` | - | 리뷰 상세 |
| POST | `/blog/posts` | 필요 | 리뷰 작성 |
| PUT | `/blog/posts/{id}` | 필요 | 본인 리뷰 수정 |
| DELETE | `/blog/posts/{id}` | 필요 | 본인 리뷰 삭제 |
| POST | `/blog/posts/{id}/publish` | 필요 | 발행/임시저장 전환 |
| POST | `/blog/posts/{id}/like` | 필요 | 좋아요 토글 |
| GET | `/blog/my-posts` | 필요 | 내 리뷰 |
| GET | `/blog/my-drafts` | 필요 | 내 임시저장 리뷰 |

리뷰 작성 본문 예시:

```json
{
  "title": "한 달 사용 후기",
  "content": "장점과 단점을 포함한 리뷰 본문입니다.",
  "tags": ["키보드", "사무용"],
  "metadata": {"productName":"Groover Keyboard","storeName":"공식몰","price":59000,"rating":4,"purchaseStatus":"구매완료"},
  "publish": true
}
```

## 댓글·검색·태그

| Method | Path | 인증 | 설명 |
|---|---|---:|---|
| GET | `/blog/posts/{id}/comments` | - | 댓글 목록 |
| POST | `/blog/posts/{id}/comments` | 필요 | 댓글 작성 |
| DELETE | `/blog/comments/{id}` | 필요 | 본인 댓글 삭제 |
| GET | `/search?q=검색어&limit=20` | - | 리뷰 통합 검색 |
| GET | `/blog/tags/popular?limit=10` | - | 인기 태그 |
| GET | `/tags/free/search?q=키보드` | - | 태그 자동완성 |

검증 실패는 400, 인증 실패는 401, 소유권 위반은 403, 없는 리소스는 404를 반환합니다.

임시저장 리뷰와 그 댓글·좋아요는 작성자만 접근할 수 있습니다. 미인증 요청에는 401, 다른 계정에는 403을 반환합니다. 사용자 식별은 요청 본문의 ID가 아닌 검증된 JWT에서 가져옵니다.

피드의 `data`는 `{ items, nextCursor, hasMore }`입니다. 다음 요청에는 `nextCursor`를 `cursor`로 전달합니다. 내 리뷰는 `/blog/my-posts?page=0&limit=20`으로 페이지 처리하고 공개·임시저장 리뷰를 함께 반환합니다. `/blog/my-drafts`는 첫 50개 내 리뷰에서 임시저장 상태를 필터링하므로 웹에서는 내 리뷰 페이지 조회를 사용합니다.

검색 응답은 다른 API와 달리 최상위 `{ posts: [...] }` 형식입니다. 댓글 조회에는 리뷰 상세에서 받은 UUID를 사용합니다.

작성과 임시저장 모두 제목(최대 200자), 본문(10~50,000자)이 필요합니다. 요약은 `excerpt`(최대 300자), 사진은 `previewImage` URL(최대 500자), 태그는 최대 10개(각 40자)입니다. `metadata`는 `productName`, `storeName`, `price`(0 이상), `rating`(1~5), `purchaseStatus`를 지원합니다.

수정 요청의 `publish: true`는 즉시 발행합니다. 이미 발행한 리뷰를 임시저장으로 바꿀 때는 수정 후 `/blog/posts/{id}/publish`에 `{ "publish": false }`를 보내야 합니다. 이미지 업로드 API는 없습니다.

발행 전환 요청은 `PublishReviewRequest`를 사용합니다. `{}`처럼 `publish`를 생략하면 `true`로 처리하며, 명시적인 `null`은 400을 반환합니다. 리뷰 생성·수정은 현재 필드와 검증 조건이 같아 `ReviewRequest`를 공유하고, 해당 규칙이 달라지면 용도별 DTO로 분리합니다.
