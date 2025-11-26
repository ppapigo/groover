# Groover API Server

NestJS 기반 백엔드 API 서버

## 설치
```bash
npm install
```

## 환경 설정
```bash
cp .env.example .env
# .env 파일에 실제 값 입력
```

## 데이터베이스 마이그레이션
```bash
npx prisma migrate dev
npx prisma generate
```

## 실행
```bash
npm run start:dev
```

## API 문서

http://localhost:3000/api/docs
