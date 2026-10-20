# API

기본 경로는 `/v1`입니다. 응답은 원칙적으로 `{ "success": true, "data": ... }` 형태이며 인증 API에서 받은 토큰을 `Authorization: Bearer <token>`으로 전달합니다.

## 인증

| Method | Path | 인증 | 설명 |
|---|---|---:|---|
| POST | `/auth/register` | - | 회원가입 및 토큰 발급 |
| POST | `/auth/login` | - | 이메일 또는 아이디 로그인 |
| GET | `/auth/me` | 필요 | 내 정보 |
| POST | `/auth/logout` | 필요 | 클라이언트 토큰 폐기 안내용 |

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

피드의 `data`는 `{ items, nextCursor, hasMore }`입니다. 다음 요청에는 `nextCursor`를 `cursor`로 전달합니다. 내 리뷰는 `/blog/my-posts?page=0&limit=20`으로 페이지 처리하고 공개·임시저장 리뷰를 함께 반환합니다. `/blog/my-drafts`는 첫 50개 내 리뷰에서 임시저장 상태를 필터링하므로 웹에서는 내 리뷰 페이지 조회를 사용합니다.

검색 응답은 다른 API와 달리 최상위 `{ posts: [...] }` 형식입니다. 댓글 조회에는 리뷰 상세에서 받은 UUID를 사용합니다.

작성과 임시저장 모두 제목(최대 200자), 본문(10~50,000자)이 필요합니다. 요약은 `excerpt`(최대 300자), 사진은 `previewImage` URL(최대 500자), 태그는 최대 10개(각 40자)입니다. `metadata`는 `productName`, `storeName`, `price`(0 이상), `rating`(1~5), `purchaseStatus`를 지원합니다.

수정 요청의 `publish: true`는 즉시 발행합니다. 이미 발행한 리뷰를 임시저장으로 바꿀 때는 수정 후 `/blog/posts/{id}/publish`에 `{ "publish": false }`를 보내야 합니다. 이미지 업로드와 JWT 갱신 API는 없습니다.
