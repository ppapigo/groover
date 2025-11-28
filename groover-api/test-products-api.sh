#!/bin/bash
# Groover Products API 테스트 스크립트
# 실행: bash test-products-api.sh

BASE_URL="http://localhost:3000/v1"
TOKEN=""

echo "=========================================="
echo "🧪 Groover Products API 테스트"
echo "=========================================="

# 1. 로그인하여 토큰 획득
echo ""
echo "1️⃣ 로그인..."
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@groover.com","password":"password123"}')

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "❌ 로그인 실패. 토큰을 받지 못했습니다."
  echo "Response: $LOGIN_RESPONSE"
  
  # 테스트 계정 생성 시도
  echo ""
  echo "테스트 계정 생성 시도..."
  curl -s -X POST "$BASE_URL/auth/register" \
    -H "Content-Type: application/json" \
    -d '{"email":"test@groover.com","password":"password123","name":"테스트 사용자"}'
  
  # 다시 로그인
  LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"test@groover.com","password":"password123"}')
  
  TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)
fi

echo "✅ 토큰 획득 완료: ${TOKEN:0:20}..."

# 2. 상품 등록 테스트
echo ""
echo "2️⃣ 상품 등록 테스트..."
CREATE_RESPONSE=$(curl -s -X POST "$BASE_URL/products" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "테스트 상품 - 유기농 사과 3kg",
    "description": "신선한 유기농 사과입니다",
    "price": 25000,
    "originalPrice": 30000,
    "category": "FOOD",
    "subcategory": "과일",
    "brand": "테스트농장",
    "rating": 4.5,
    "reviewCount": 100,
    "source": "manual",
    "tags": ["과일", "사과", "유기농"]
  }')

echo "$CREATE_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$CREATE_RESPONSE"
PRODUCT_ID=$(echo $CREATE_RESPONSE | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
echo "생성된 상품 ID: $PRODUCT_ID"

# 3. 상품 목록 조회
echo ""
echo "3️⃣ 상품 목록 조회..."
curl -s "$BASE_URL/products?page=1&limit=5" | python3 -m json.tool 2>/dev/null

# 4. 카테고리별 필터링
echo ""
echo "4️⃣ 카테고리별 필터링 (FOOD)..."
curl -s "$BASE_URL/products?category=FOOD&limit=5" | python3 -m json.tool 2>/dev/null

# 5. 가격 범위 필터링
echo ""
echo "5️⃣ 가격 범위 필터링 (10000~30000원)..."
curl -s "$BASE_URL/products?minPrice=10000&maxPrice=30000&limit=5" | python3 -m json.tool 2>/dev/null

# 6. 상품 검색
echo ""
echo "6️⃣ 상품 검색 (사과)..."
curl -s "$BASE_URL/products/search?q=사과&limit=5" | python3 -m json.tool 2>/dev/null

# 7. 카테고리 목록 조회
echo ""
echo "7️⃣ 카테고리 목록 조회..."
curl -s "$BASE_URL/products/categories" | python3 -m json.tool 2>/dev/null

# 8. 인기 상품 조회
echo ""
echo "8️⃣ 인기 상품 조회..."
curl -s "$BASE_URL/products/popular?limit=5" | python3 -m json.tool 2>/dev/null

# 9. 상품 상세 조회
if [ ! -z "$PRODUCT_ID" ]; then
  echo ""
  echo "9️⃣ 상품 상세 조회 (ID: $PRODUCT_ID)..."
  curl -s "$BASE_URL/products/$PRODUCT_ID" | python3 -m json.tool 2>/dev/null
fi

# 10. 상품 수정
if [ ! -z "$PRODUCT_ID" ]; then
  echo ""
  echo "🔟 상품 수정..."
  curl -s -X PATCH "$BASE_URL/products/$PRODUCT_ID" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{
      "price": 22000,
      "description": "신선한 유기농 사과입니다 (할인 중!)"
    }' | python3 -m json.tool 2>/dev/null
fi

# 11. 상품 삭제 (소프트)
if [ ! -z "$PRODUCT_ID" ]; then
  echo ""
  echo "1️⃣1️⃣ 상품 삭제 (소프트)..."
  curl -s -X DELETE "$BASE_URL/products/$PRODUCT_ID" \
    -H "Authorization: Bearer $TOKEN" | python3 -m json.tool 2>/dev/null
fi

echo ""
echo "=========================================="
echo "✅ 테스트 완료!"
echo "=========================================="
