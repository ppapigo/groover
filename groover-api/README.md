# 🚀 Groover Products Module 수정 파일

## 📁 폴더 구조

```
groover-files/
├── groover-schema-fix.sql        # DB에서 실행할 SQL
├── test-products-api.sh          # API 테스트 스크립트
│
├── prisma/
│   ├── schema.prisma             # → C:\dev\groover\groover-api\prisma\schema.prisma
│   └── seed.ts                   # → C:\dev\groover\groover-api\prisma\seed.ts
│
└── src/
    └── products/
        ├── products.module.ts    # → C:\dev\groover\groover-api\src\products\
        ├── products.service.ts   # → C:\dev\groover\groover-api\src\products\
        ├── products.controller.ts# → C:\dev\groover\groover-api\src\products\
        └── dto/
            ├── create-product.dto.ts  # → ...\src\products\dto\
            ├── update-product.dto.ts  # → ...\src\products\dto\
            └── filter-product.dto.ts  # → ...\src\products\dto\
```

---

## 🔧 설치 순서

### 1️⃣ PostgreSQL 스키마 업데이트
```powershell
cd C:\dev\groover\groover-api
psql -U groover_user -d groover -f groover-schema-fix.sql
# 비밀번호: 142857
```

### 2️⃣ 파일 복사
압축 해제 후:
- `prisma/` 폴더 → `C:\dev\groover\groover-api\prisma\` (덮어쓰기)
- `src/products/` 폴더 → `C:\dev\groover\groover-api\src\products\` (덮어쓰기)

### 3️⃣ Prisma 클라이언트 재생성
```powershell
cd C:\dev\groover\groover-api
npx prisma generate
```

### 4️⃣ 서버 시작
```powershell
npm run start:dev
```

### 5️⃣ 테스트 데이터 시딩 (선택)
```powershell
npx ts-node prisma/seed.ts
```

### 6️⃣ API 테스트
```powershell
# 상품 목록 조회
curl http://localhost:3000/v1/products

# 카테고리 목록
curl http://localhost:3000/v1/products/categories

# 검색
curl "http://localhost:3000/v1/products/search?q=사과"
```

---

## ✅ 체크리스트

- [ ] SQL 실행 완료
- [ ] 파일 복사 완료
- [ ] `npx prisma generate` 실행
- [ ] 서버 정상 시작
- [ ] API 테스트 통과

문제 있으면 말씀해주세요! 🙌
