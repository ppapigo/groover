# 🛒 Groover - AI 기반 스마트 장바구니 추천 앱

> 예산을 입력하면 AI가 최적의 상품 조합을 자동으로 추천해주는 스마트 쇼핑 앱

## 📋 프로젝트 구조
```
groover/
├── groover-api/      # 백엔드 API (NestJS)
├── groover-app/      # 모바일 앱 (React Native)
├── groover-ai/       # AI 추천 엔진 (Python)
└── docs/            # 프로젝트 문서
```

## 🚀 빠른 시작

### 백엔드 실행
```bash
cd groover-api
npm install
cp .env.example .env
npm run start:dev
```

### 프론트엔드 실행
```bash
cd groover-app
npm install
cp .env.example .env
npx react-native run-ios  # or run-android
```

### AI 엔진 실행
```bash
cd groover-ai
pip install -r requirements.txt
python src/server.py
```

## 📚 문서

- [API 명세서](docs/API.md)
- [시스템 아키텍처](docs/ARCHITECTURE.md)
- [배포 가이드](docs/DEPLOYMENT.md)

## 🛠️ 기술 스택

- **Frontend**: React Native, TypeScript
- **Backend**: NestJS, PostgreSQL, Redis
- **AI**: Python, OpenAI GPT-4

## 📄 라이센스

MIT License
