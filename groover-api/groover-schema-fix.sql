-- Groover Products 테이블 스키마 업데이트
-- 실행: psql -U groover_user -d groover -f groover-schema-fix.sql
-- 또는 pgAdmin에서 직접 실행

-- 1. 누락된 컬럼 추가
ALTER TABLE products ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS subcategory VARCHAR(255);
ALTER TABLE products ADD COLUMN IF NOT EXISTS source VARCHAR(255) DEFAULT 'manual';
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- 2. 기존 레코드가 있다면 기본값 설정
UPDATE products SET source = 'manual' WHERE source IS NULL;
UPDATE products SET is_active = TRUE WHERE is_active IS NULL;

-- 3. 인덱스 생성 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_products_source ON products(source);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_products_subcategory ON products(subcategory);

-- 4. 확인 쿼리
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'products'
ORDER BY ordinal_position;
