# Groover Web

Groover 리뷰 서비스의 React + Vite 웹 클라이언트입니다. 모든 애플리케이션 소스는 JavaScript와 JSX로 작성되어 있습니다.

## 요구 사항

- Node.js 20.19+ 또는 22.12+ (권장: Node.js 24)
- Groover API 서버 (`http://localhost:3000/v1`)

## 실행

저장소 루트에서 `cd groover-web`으로 이동한 뒤 실행합니다.

```bash
npm ci --include=dev
npm run dev
```

설치가 성공한 뒤 개발 서버를 시작하세요. Vite는 개발 의존성이므로 `--include=dev`로 함께 설치합니다. 의존성을 다시 설치할 때는 기존 개발 서버를 `Ctrl+C`로 먼저 종료하세요. Windows에서는 실행 중인 서버가 설치 파일을 잠글 수 있습니다.

웹은 기본적으로 `http://localhost:3001`에서 실행됩니다.

Access token은 메모리에만 저장하고, 새로고침 시 API의 HttpOnly refresh 쿠키로 로그인 상태를 복원합니다. 개발 API는 `dev` 프로필로 실행하고 웹/API 모두 `localhost` 호스트를 사용하세요. `localhost`와 `127.0.0.1`을 섞으면 쿠키와 Origin이 달라집니다. 운영은 HTTPS의 동일 Origin `/v1`을 사용합니다. 인증 POST의 CSRF 토큰 전송과 만료 토큰 갱신은 API 클라이언트가 처리합니다.

`vite`를 찾을 수 없다는 오류가 나면 의존성 설치가 완료되었는지 확인하세요. `Port 3001 is already in use`가 나오면 기존 서버를 이용하거나 종료한 뒤 다시 실행합니다. 웹 화면이 열려도 리뷰 조회·로그인에는 별도로 실행한 API가 필요합니다.

`npm run build`는 정적 파일을 `dist/`에 생성합니다. `npm run preview` 또는 `npm start`로 빌드를 로컬에서 확인할 수 있습니다. 운영에서는 `dist/`를 정적 호스팅에 배포합니다.

## 환경변수

```env
VITE_API_URL=http://localhost:3000/v1
```

## 디렉터리

```text
src/
├── pages/        # React Router 페이지 (.jsx)
├── components/   # 재사용 UI 컴포넌트 (.jsx)
├── contexts/     # React Context (.jsx)
├── hooks/        # 커스텀 훅 (.js)
└── lib/          # API와 공통 유틸리티 (.js)
```

`.env.example`을 `.env.local`로 복사해 API 주소를 설정할 수 있습니다. 환경변수는 빌드 시 반영되므로 배포 주소가 바뀌면 다시 빌드해야 합니다.

`src/main.jsx`가 진입점이고 `src/App.jsx`가 라우트를 정의합니다. `jsconfig.json`과 `vite.config.js`에서 `@/*`를 `src/*` 경로 별칭으로 연결합니다.

## 기능과 API

- `/`: 홈, `/blog`: 최신·인기·태그별 리뷰, `/blog/:slug`: 상세·댓글·좋아요
- `/search?q=...`: 검색, `/login`, `/signup`: 인증
- `/write?edit=...`: 작성·수정, `/profile`, `/profile/posts`, `/profile/drafts`: 내 기록
- 인증이 필요한 주소는 로그인 후 원래 주소로 돌아옵니다. 회원가입 응답의 JWT로 바로 로그인합니다.
- API 요청은 `src/lib/api.js`, 리뷰 계약은 `src/lib/reviewApi.js`에서 관리합니다. JWT 만료 시 로컬 인증을 해제하며 갱신 API는 호출하지 않습니다.
- 제목과 10자 이상의 본문은 임시저장에도 필요합니다. 사진은 HTTP(S) URL로 입력하며 본문 이미지 표기 `![설명](https://...)`를 지원합니다. 업로드 API는 제공하지 않습니다.
- 가격은 `metadata.price`, 평점은 `metadata.rating`, 한 줄 요약은 `excerpt`에 저장합니다.
- `public/sw.js`는 기존 PWA 설치자의 캐시와 등록을 해제하기 위한 전환 파일입니다. 새 서비스 워커를 등록하지 않습니다.
- 정적 호스팅에서는 `/blog/:slug` 같은 직접 접근 주소를 `index.html`로 연결해야 합니다. `public/_redirects`를 지원하지 않는 호스팅은 [배포 가이드](../docs/DEPLOYMENT.md)를 따르세요.

## 검증

```bash
npm run lint
npm test
npm run build
```

Vitest와 React Testing Library로 라우팅, 인증, 리뷰 저장·발행·삭제, 댓글·좋아요, 피드 페이지 처리와 검색 응답 순서를 검증합니다. 테스트는 Spring 응답 형식의 API 모의 응답을 사용하며 실제 서버 통합 테스트를 대신하지 않습니다.
