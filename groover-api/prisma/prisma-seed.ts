// prisma/seed.ts
// 실행: npx prisma db seed 또는 npx ts-node prisma/seed.ts

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 카테고리 정의
const categories = {
  FOOD: ['과일', '채소', '정육', '수산물', '유제품', '음료', '과자', '냉동식품', '조미료'],
  HOUSEHOLD: ['세제', '화장지', '주방용품', '욕실용품', '청소용품'],
  BEAUTY: ['스킨케어', '헤어케어', '바디케어', '메이크업'],
  ELECTRONICS: ['휴대폰', '컴퓨터', '가전제품', '주변기기'],
  HEALTH: ['건강식품', '의약품', '운동용품'],
};

// 샘플 상품 데이터
const sampleProducts = [
  // 식품 - 과일
  {
    name: '제주 감귤 5kg',
    description: '제주 서귀포산 당도 높은 감귤',
    price: 25900,
    originalPrice: 32000,
    category: 'FOOD',
    subcategory: '과일',
    brand: '제주농협',
    rating: 4.7,
    reviewCount: 1523,
    popularityScore: 89.5,
    source: 'manual',
    tags: ['과일', '감귤', '제주', '비타민C'],
  },
  {
    name: '경북 사과 5kg (부사)',
    description: '아삭하고 달콤한 경북 영주산 부사 사과',
    price: 29900,
    originalPrice: 35000,
    category: 'FOOD',
    subcategory: '과일',
    brand: '경북농협',
    rating: 4.8,
    reviewCount: 2341,
    popularityScore: 92.3,
    source: 'manual',
    tags: ['과일', '사과', '부사', '경북'],
  },
  {
    name: '필리핀 바나나 1.5kg',
    description: '달콤한 필리핀산 캐번디시 바나나',
    price: 5990,
    originalPrice: 7000,
    category: 'FOOD',
    subcategory: '과일',
    brand: 'Dole',
    rating: 4.5,
    reviewCount: 891,
    popularityScore: 78.2,
    source: 'manual',
    tags: ['과일', '바나나', '수입', '간식'],
  },

  // 식품 - 정육
  {
    name: '한우 등심 1등급 300g',
    description: '마블링 좋은 한우 1등급 등심',
    price: 35900,
    originalPrice: 42000,
    category: 'FOOD',
    subcategory: '정육',
    brand: '한우마을',
    rating: 4.9,
    reviewCount: 567,
    popularityScore: 95.1,
    source: 'manual',
    tags: ['한우', '등심', '스테이크', '고기'],
  },
  {
    name: '국내산 삼겹살 500g',
    description: '두툼하고 지방 밸런스 좋은 삼겹살',
    price: 18900,
    originalPrice: 22000,
    category: 'FOOD',
    subcategory: '정육',
    brand: '도드람',
    rating: 4.6,
    reviewCount: 1234,
    popularityScore: 87.8,
    source: 'manual',
    tags: ['돼지고기', '삼겹살', '구이', '국내산'],
  },
  {
    name: '닭가슴살 1kg (냉동)',
    description: '고단백 저지방 냉동 닭가슴살',
    price: 9900,
    originalPrice: 12000,
    category: 'FOOD',
    subcategory: '정육',
    brand: '하림',
    rating: 4.4,
    reviewCount: 3456,
    popularityScore: 82.5,
    source: 'manual',
    tags: ['닭고기', '닭가슴살', '다이어트', '단백질'],
  },

  // 식품 - 유제품
  {
    name: '서울우유 1L',
    description: '신선한 국산 원유 100%',
    price: 2890,
    originalPrice: 3200,
    category: 'FOOD',
    subcategory: '유제품',
    brand: '서울우유',
    rating: 4.7,
    reviewCount: 5678,
    popularityScore: 91.2,
    source: 'manual',
    tags: ['우유', '유제품', '칼슘'],
  },
  {
    name: '그릭요거트 450g',
    description: '고단백 진한 그릭 요거트',
    price: 5490,
    originalPrice: 6500,
    category: 'FOOD',
    subcategory: '유제품',
    brand: '매일유업',
    rating: 4.6,
    reviewCount: 2345,
    popularityScore: 84.7,
    source: 'manual',
    tags: ['요거트', '그릭요거트', '단백질', '간식'],
  },

  // 생활용품 - 세제
  {
    name: '액체세제 리필 2.5L',
    description: '강력 세정력 저자극 액체세제',
    price: 12900,
    originalPrice: 15000,
    category: 'HOUSEHOLD',
    subcategory: '세제',
    brand: 'LG생활건강',
    rating: 4.5,
    reviewCount: 4567,
    popularityScore: 86.3,
    source: 'manual',
    tags: ['세제', '세탁', '빨래'],
  },
  {
    name: '주방세제 순 500ml',
    description: '천연 유래 성분 저자극 주방세제',
    price: 3990,
    originalPrice: 4500,
    category: 'HOUSEHOLD',
    subcategory: '세제',
    brand: '샤프란',
    rating: 4.6,
    reviewCount: 3456,
    popularityScore: 83.9,
    source: 'manual',
    tags: ['주방', '세제', '설거지'],
  },

  // 생활용품 - 화장지
  {
    name: '코튼롤 화장지 30롤',
    description: '부드러운 3겹 순면 화장지',
    price: 19900,
    originalPrice: 24000,
    category: 'HOUSEHOLD',
    subcategory: '화장지',
    brand: '깨끗한나라',
    rating: 4.7,
    reviewCount: 8901,
    popularityScore: 93.5,
    source: 'manual',
    tags: ['화장지', '생활용품', '필수품'],
  },
  {
    name: '물티슈 80매 10팩',
    description: '순면 저자극 물티슈',
    price: 9900,
    originalPrice: 12000,
    category: 'HOUSEHOLD',
    subcategory: '화장지',
    brand: '베베숲',
    rating: 4.8,
    reviewCount: 6789,
    popularityScore: 90.1,
    source: 'manual',
    tags: ['물티슈', '위생', '아기용품'],
  },

  // 뷰티 - 스킨케어
  {
    name: '에센스 토너 200ml',
    description: '촉촉한 수분 에센스 토너',
    price: 18900,
    originalPrice: 25000,
    category: 'BEAUTY',
    subcategory: '스킨케어',
    brand: '아이오페',
    rating: 4.6,
    reviewCount: 2345,
    popularityScore: 85.7,
    source: 'manual',
    tags: ['스킨케어', '토너', '수분', '기초화장'],
  },
  {
    name: '수분크림 50ml',
    description: '24시간 수분 유지 보습크림',
    price: 32000,
    originalPrice: 42000,
    category: 'BEAUTY',
    subcategory: '스킨케어',
    brand: '설화수',
    rating: 4.8,
    reviewCount: 1567,
    popularityScore: 91.8,
    source: 'manual',
    tags: ['크림', '보습', '스킨케어', '고급'],
  },

  // 건강
  {
    name: '멀티비타민 90정',
    description: '하루 한 알 종합비타민',
    price: 24900,
    originalPrice: 30000,
    category: 'HEALTH',
    subcategory: '건강식품',
    brand: '종근당',
    rating: 4.5,
    reviewCount: 3456,
    popularityScore: 87.2,
    source: 'manual',
    tags: ['비타민', '건강식품', '영양제'],
  },
  {
    name: '오메가3 120캡슐',
    description: '순도 높은 EPA/DHA 오메가3',
    price: 29900,
    originalPrice: 38000,
    category: 'HEALTH',
    subcategory: '건강식품',
    brand: '뉴트리원',
    rating: 4.7,
    reviewCount: 2890,
    popularityScore: 88.9,
    source: 'manual',
    tags: ['오메가3', '건강식품', '혈행'],
  },

  // 음료
  {
    name: '제주 삼다수 2L 6병',
    description: '청정 제주 화산암반수',
    price: 5490,
    originalPrice: 6000,
    category: 'FOOD',
    subcategory: '음료',
    brand: '농심',
    rating: 4.9,
    reviewCount: 12345,
    popularityScore: 96.5,
    source: 'manual',
    tags: ['생수', '음료', '제주'],
  },
  {
    name: '코카콜라 제로 355ml 24캔',
    description: '칼로리 제로 탄산음료',
    price: 18900,
    originalPrice: 22000,
    category: 'FOOD',
    subcategory: '음료',
    brand: '코카콜라',
    rating: 4.7,
    reviewCount: 5678,
    popularityScore: 89.8,
    source: 'manual',
    tags: ['탄산', '음료', '제로칼로리'],
  },

  // 과자/간식
  {
    name: '허니버터칩 60g 10봉',
    description: '달콤 짭짤한 인기 스낵',
    price: 12900,
    originalPrice: 15000,
    category: 'FOOD',
    subcategory: '과자',
    brand: '해태',
    rating: 4.6,
    reviewCount: 4567,
    popularityScore: 88.3,
    source: 'manual',
    tags: ['과자', '스낵', '허니버터'],
  },
  {
    name: '초코파이 12개입',
    description: '부드러운 마시멜로 초코파이',
    price: 4990,
    originalPrice: 5500,
    category: 'FOOD',
    subcategory: '과자',
    brand: '오리온',
    rating: 4.8,
    reviewCount: 8901,
    popularityScore: 92.1,
    source: 'manual',
    tags: ['과자', '초코파이', '간식'],
  },
];

async function main() {
  console.log('🌱 시드 데이터 생성 시작...\n');

  // 기존 상품 삭제 (개발 환경에서만)
  if (process.env.NODE_ENV === 'development') {
    await prisma.cartItem.deleteMany();
    await prisma.product.deleteMany();
    console.log('🗑️  기존 상품 데이터 삭제 완료');
  }

  // 상품 생성
  let created = 0;
  for (const product of sampleProducts) {
    try {
      await prisma.product.create({
        data: {
          ...product,
          normalizedName: product.name
            .toLowerCase()
            .replace(/\[.*?\]/g, '')
            .replace(/\(.*?\)/g, '')
            .replace(/[^가-힣a-z0-9\s]/g, '')
            .trim(),
          isActive: true,
        },
      });
      created++;
      console.log(`✅ 생성: ${product.name}`);
    } catch (error) {
      console.error(`❌ 실패: ${product.name}`, error.message);
    }
  }

  console.log(`\n🎉 시드 완료! ${created}개 상품 생성됨\n`);

  // 카테고리별 통계
  const stats = await prisma.product.groupBy({
    by: ['category'],
    _count: { category: true },
  });
  
  console.log('📊 카테고리별 상품 수:');
  stats.forEach((s) => {
    console.log(`   ${s.category}: ${s._count.category}개`);
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
