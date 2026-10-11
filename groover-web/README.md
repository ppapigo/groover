# Groover Web

Groover 리뷰 서비스의 Next.js 웹 클라이언트입니다. 모든 애플리케이션 소스는 JavaScript와 JSX로 작성되어 있습니다.

## 요구 사항

- Node.js 20 이상
- Groover API 서버 (`http://localhost:3000/v1`)

## 실행

```bash
npm ci
npm run dev
```

웹은 기본적으로 `http://localhost:3001`에서 실행됩니다.

## 환경변수

```env
NEXT_PUBLIC_API_URL=http://localhost:3000/v1
```

## 디렉터리

```text
src/
├── app/          # App Router 페이지 (.jsx)
├── components/   # 재사용 UI 컴포넌트 (.jsx)
├── contexts/     # React Context (.jsx)
├── hooks/        # 커스텀 훅 (.js)
└── lib/          # API와 공통 유틸리티 (.js)
```

`jsconfig.json`에서 `@/*`를 `src/*` 경로 별칭으로 연결합니다.

## 검증

```bash
npm run build
```
