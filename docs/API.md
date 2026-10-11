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

## 리뷰

| Method | Path | 인증 | 설명 |
|---|---|---:|---|
| GET | `/blog/feed?page=0&limit=20` | - | 최신 공개 리뷰 |
| GET | `/blog/feed/popular?page=0&limit=20` | - | 좋아요·조회수 순 리뷰 |
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
