# Groover Frontend - 대시보드

## 📁 구조

```
groover-frontend/
├── src/
│   ├── app/
│   │   ├── dashboard/
│   │   │   └── page.tsx        # 대시보드 페이지
│   │   ├── layout.tsx          # 루트 레이아웃
│   │   └── globals.css         # 글로벌 스타일
│   ├── components/
│   │   └── dashboard/
│   │       ├── StatCard.tsx    # 통계 카드
│   │       ├── StatsChart.tsx  # 조회수/클릭수 차트
│   │       ├── EarningsChart.tsx # 수익 차트
│   │       ├── ActivityList.tsx # 최근 활동
│   │       ├── CreatorDashboard.tsx # 크리에이터 대시보드
│   │       └── AdvertiserDashboard.tsx # 광고주 대시보드
│   ├── hooks/
│   │   └── useDashboard.ts     # React Query Hooks
│   └── lib/
│       ├── api.ts              # API 클라이언트
│       ├── utils.ts            # 유틸리티
│       └── providers.tsx       # React Query Provider
├── package.json
├── tsconfig.json
├── tailwind.config.js
├── postcss.config.js
└── next.config.js
```

---

## 🔧 설치 및 실행

### Step 1: 파일 복사

```powershell
cd C:\Users\HP\Downloads
Expand-Archive -Path groover-frontend-dashboard.zip -DestinationPath . -Force

# 기존 프론트엔드 폴더에 복사하거나, 새 폴더로 사용
Copy-Item -Path "groover-frontend/*" -Destination "C:\dev\groover\groover-frontend\" -Recurse -Force
```

### Step 2: 의존성 설치

```powershell
cd C:\dev\groover\groover-frontend
npm install
```

### Step 3: 환경 변수 설정

`.env.local` 파일 생성:

```env
NEXT_PUBLIC_API_URL=http://localhost:3000
```

### Step 4: 개발 서버 실행

```powershell
# 백엔드 먼저 실행
cd C:\dev\groover\groover-api
npm run start:dev

# 프론트엔드 실행 (새 터미널)
cd C:\dev\groover\groover-frontend
npm run dev
```

### Step 5: 브라우저에서 확인

```
http://localhost:3001/dashboard
```

---

## 📊 기능

### 크리에이터 대시보드

- 💰 출금 가능 잔액
- 📈 7일/30일 조회수, 클릭수
- 💵 7일 수익, 총 수익
- 📋 진행/완료된 광고
- 📊 조회수/클릭수 차트
- 💹 수익 차트
- 🕐 최근 활동

### 광고주 대시보드

- 💸 총 지출, 월 지출
- 🎯 진행/완료된 광고
- ⏰ 대기 중인 제안
- ⚠️ 확인 필요 알림
- 🕐 최근 활동

---

## 🔌 API 연동

### 백엔드 API 엔드포인트

| 경로 | 설명 |
|------|------|
| `GET /dashboard/creator` | 크리에이터 통계 |
| `GET /dashboard/advertiser` | 광고주 통계 |
| `GET /dashboard/stats?days=7` | 일별 통계 |
| `GET /dashboard/earnings?days=7` | 수익 통계 |
| `GET /dashboard/activity?limit=10` | 최근 활동 |

### 인증

`localStorage`의 `token`을 자동으로 API 요청 헤더에 추가합니다.

```typescript
// 로그인 후 토큰 저장
import { api } from '@/lib/api';
api.setToken('your-jwt-token');
```

---

## 📱 반응형

- **Desktop**: 4열 그리드
- **Tablet**: 2열 그리드
- **Mobile**: 1열 그리드

---

## 🎨 커스터마이징

### 색상 변경

`tailwind.config.js`에서 primary 색상 수정:

```javascript
theme: {
  extend: {
    colors: {
      primary: {
        500: '#your-color',
        600: '#your-darker-color',
      },
    },
  },
},
```

### 차트 색상 변경

`StatsChart.tsx`, `EarningsChart.tsx`에서 `stroke`, `fill` 속성 수정
