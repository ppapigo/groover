# 📝 Groover Blog Module

쇼핑 기반 블로그 + 파트너스 연동 + 협찬 문구 자동화

## 🎯 핵심 기능

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         Groover Blog 아키텍처                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  📱 모바일 앱          💻 웹앱 (Next.js)                                  │
│       │                     │                                            │
│       └─────────┬───────────┘                                            │
│                 │                                                        │
│                 ▼                                                        │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                    Blog API (NestJS)                            │    │
│  │                                                                  │    │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │    │
│  │  │ ProductLink     │  │ Disclaimer      │  │ Affiliate       │  │    │
│  │  │ Parser          │  │ Service         │  │ Service         │  │    │
│  │  │                 │  │                 │  │                 │  │    │
│  │  │ • 쿠팡 링크     │  │ • 협찬 문구     │  │ • 클릭 추적     │  │    │
│  │  │ • 네이버 링크   │  │ • 자동 삽입     │  │ • 리다이렉트    │  │    │
│  │  │ • 내부 상품     │  │ • 삭제 불가     │  │ • 분석 로그     │  │    │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────┘  │    │
│  │                                                                  │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                 │                                                        │
│                 ▼                                                        │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                    PostgreSQL + Prisma                          │    │
│  │         posts / post_products / post_likes                       │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

## ✅ 기능 체크리스트

| 기능 | 설명 | 상태 |
|------|------|------|
| 글 작성 | 제목, 본문, 태그, 이미지 | ✅ |
| 상품 링크 자동 감지 | 쿠팡/네이버 URL → 상품 카드 | ✅ |
| 협찬 문구 자동 삽입 | 파트너스 링크 있으면 자동 추가 | ✅ |
| 협찬 문구 삭제 불가 | 마커 기반 보호 | ✅ |
| 피드 (무한스크롤) | 커서 기반 페이지네이션 | ✅ |
| 글 상세 | SSR/SEO 지원 | ✅ |
| 연관 글 추천 | 태그/작성자/최신 기반 | ✅ |
| 상품 클릭 프록시 | 데이터 마이닝 방지 | ✅ |
| 좋아요 | 토글 방식 | ✅ |
| 다국어 협찬 문구 | ko/en/ja/zh | ✅ |

---

## 🔧 설치

### 1. 패키지 설치

```powershell
cd C:\dev\groover\groover-api
npm install @nestjs/axios axios
```

### 2. 파일 복사

```
groover-api/
├── src/
│   ├── blog/                    # 전체 복사
│   │   ├── blog.module.ts
│   │   ├── blog.controller.ts
│   │   ├── blog.service.ts
│   │   ├── product-click.controller.ts
│   │   ├── dto/
│   │   │   ├── create-post.dto.ts
│   │   │   ├── update-post.dto.ts
│   │   │   └── feed-query.dto.ts
│   │   └── services/
│   │       ├── product-link-parser.service.ts
│   │       ├── disclaimer.service.ts
│   │       └── affiliate.service.ts
│   └── auth/
│       └── guards/
│           └── optional-jwt-auth.guard.ts  # 추가
```

### 3. Prisma 스키마 추가

`prisma/schema.prisma`에 추가:

```prisma
model Post {
  id            String    @id @default(uuid())
  userId        String
  user          User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  title         String
  content       String
  previewImage  String?
  tags          String[]
  slug          String    @unique
  excerpt       String?
  
  viewCount     Int       @default(0)
  likeCount     Int       @default(0)
  status        String    @default("DRAFT")
  publishedAt   DateTime?
  hasAffiliateLinks  Boolean  @default(false)
  
  products      PostProduct[]
  likes         PostLike[]
  
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  
  @@index([userId])
  @@index([status])
  @@index([publishedAt])
  @@index([slug])
}

model PostProduct {
  id            String    @id @default(uuid())
  postId        String
  post          Post      @relation(fields: [postId], references: [id], onDelete: Cascade)
  
  productId     String
  source        String    // "coupang" | "naver" | "internal"
  name          String
  image         String?
  price         Int?
  originalUrl   String
  affiliateUrl  String
  position      Int       @default(0)
  
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  
  @@index([postId])
  @@unique([postId, productId, source])
}

model PostLike {
  id        String   @id @default(uuid())
  postId    String
  post      Post     @relation(fields: [postId], references: [id], onDelete: Cascade)
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  createdAt DateTime @default(now())
  
  @@unique([postId, userId])
  @@index([postId])
  @@index([userId])
}
```

### 4. User 모델에 관계 추가

```prisma
model User {
  // ... 기존 필드
  posts         Post[]
  postLikes     PostLike[]
}
```

### 5. 마이그레이션

```powershell
npx prisma migrate dev --name add_blog
npx prisma generate
```

### 6. app.module.ts 수정

```typescript
import { BlogModule } from './blog/blog.module';

@Module({
  imports: [
    // ...
    BlogModule,
  ],
})
```

### 7. 환경변수 (.env)

```env
# 파트너스 ID (선택사항 - 없으면 원본 URL 사용)
COUPANG_PARTNERS_ID=your_coupang_id
NAVER_PARTNERS_ID=your_naver_id

# 기본 로케일
LOCALE=ko
```

### 8. 서버 재시작

```powershell
npm run start:dev
```

---

## 📡 API 명세

### 글 작성

```http
POST /v1/blog/posts
Authorization: Bearer {token}
Content-Type: application/json

{
  "title": "최고의 주방용품 추천",
  "content": "<p>이 냄비 정말 좋아요!</p><p>https://www.coupang.com/vp/products/123456</p>",
  "tags": ["주방", "추천"],
  "publish": true
}
```

**응답:**
```json
{
  "success": true,
  "message": "글이 작성되었습니다.",
  "data": {
    "id": "uuid",
    "title": "최고의 주방용품 추천",
    "slug": "최고의-주방용품-추천-a1b2c3",
    "hasAffiliateLinks": true,
    "products": [
      {
        "id": "uuid",
        "name": "쿠팡 상품 #123456",
        "source": "coupang"
      }
    ]
  }
}
```

### 피드 조회

```http
GET /v1/blog/feed?limit=20&cursor=2024-01-01T00:00:00Z
```

**응답:**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "title": "최고의 주방용품 추천",
        "previewImage": "https://...",
        "excerpt": "이 냄비 정말 좋아요...",
        "slug": "최고의-주방용품-추천-a1b2c3",
        "author": { "id": "uuid", "nickname": "그루버" },
        "publishedAt": "2024-01-01T00:00:00Z"
      }
    ],
    "nextCursor": "2024-01-02T00:00:00Z",
    "hasMore": true
  }
}
```

### 글 상세

```http
GET /v1/blog/posts/{slug}
```

**응답:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "title": "최고의 주방용품 추천",
    "content": "<p>이 냄비 정말 좋아요!</p>...<div class=\"groover-disclaimer\">...</div>",
    "hasAffiliateLinks": true,
    "isLiked": false,
    "isOwner": false
  }
}
```

### 상품 정보 (Lazy Load)

```http
GET /v1/blog/posts/{id}/products
```

**응답:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "스테인리스 냄비",
      "image": "https://...",
      "price": 29900,
      "source": "coupang",
      "clickUrl": "/v1/blog/products/uuid/click"
    }
  ]
}
```

### 상품 클릭 (리다이렉트)

```http
GET /v1/blog/products/{id}/click
→ 302 Redirect to 파트너스 URL
```

---

## 🛡️ 보안 & 데이터 마이닝 방지

### 1. 상품 URL 프록시
- 파트너스 URL을 직접 노출하지 않음
- 클릭 시 서버에서 302 리다이렉트
- 클릭 로그로 악용 패턴 감지

### 2. Rate Limiting
- 상품 클릭: 초당 5회 제한
- 피드 조회: 기본 Rate Limit 적용

### 3. 협찬 문구 보호
- HTML 마커로 감싸서 삭제 방지
- 저장 시 검증, 수정 시 재삽입

### 4. Lazy Load
- SSR 시 최소 정보만 포함
- 상품 가격/이미지는 클라이언트에서 별도 호출

---

## 🧪 테스트

```powershell
# 로그인
$login = Invoke-RestMethod -Uri "http://localhost:3000/v1/auth/login" -Method POST -ContentType "application/json" -Body '{"email":"test@groover.com","password":"password123"}'
$token = $login.accessToken
$headers = @{ Authorization = "Bearer $token" }

# 글 작성 (쿠팡 링크 포함)
$body = @{
  title = "테스트 글"
  content = "<p>좋은 상품입니다</p><p>https://www.coupang.com/vp/products/123456789</p>"
  tags = @("테스트", "추천")
  publish = $true
} | ConvertTo-Json

$post = Invoke-RestMethod -Uri "http://localhost:3000/v1/blog/posts" -Method POST -ContentType "application/json" -Headers $headers -Body $body
$post.data

# 피드 조회
Invoke-RestMethod -Uri "http://localhost:3000/v1/blog/feed" -Method GET

# 글 상세 조회
Invoke-RestMethod -Uri "http://localhost:3000/v1/blog/posts/$($post.data.slug)" -Method GET

# 상품 정보 조회
Invoke-RestMethod -Uri "http://localhost:3000/v1/blog/posts/$($post.data.id)/products" -Method GET

# 좋아요 토글
Invoke-RestMethod -Uri "http://localhost:3000/v1/blog/posts/$($post.data.id)/like" -Method POST -Headers $headers
```

---

## 🌐 웹앱 (Next.js) 연동

### 라우팅 구조

```
pages/
├── blog/
│   ├── index.tsx          # /blog - 피드
│   ├── [slug].tsx         # /blog/{slug} - 상세
│   └── tag/
│       └── [tag].tsx      # /blog/tag/{tag}
```

### SSR/ISR 설정

```typescript
// pages/blog/[slug].tsx
export async function getStaticProps({ params }) {
  const res = await fetch(`${API_URL}/v1/blog/posts/${params.slug}`);
  const post = await res.json();
  
  return {
    props: { post: post.data },
    revalidate: 60, // ISR: 60초마다 재생성
  };
}

export async function getStaticPaths() {
  return {
    paths: [],
    fallback: 'blocking', // 없는 페이지는 SSR
  };
}
```

### SEO 메타 태그

```typescript
<Head>
  <title>{post.title} | Groover Blog</title>
  <meta name="description" content={post.excerpt} />
  <meta property="og:title" content={post.title} />
  <meta property="og:description" content={post.excerpt} />
  <meta property="og:image" content={post.previewImage} />
</Head>
```

---

## 📊 비용 영향

- **파트너스 API**: 무료 (쿠팡/네이버 파트너스)
- **상품 정보 캐싱**: DB 저장으로 API 호출 최소화
- **이미지 CDN**: 외부 이미지 URL 그대로 사용 (비용 없음)

---

## 🔜 확장 가능

1. **글로벌 확장**
   - 아마존/쇼피/라자다 파트너스 추가
   - 협찬 문구 템플릿 지역별 설정

2. **분석 대시보드**
   - 클릭 통계
   - 수익 추적 (파트너스 API 연동)

3. **에디터 개선**
   - TipTap/Editor.js 연동
   - 드래그 앤 드롭 이미지 업로드
