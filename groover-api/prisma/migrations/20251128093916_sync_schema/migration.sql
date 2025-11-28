/*
  Warnings:

  - You are about to drop the column `cart_code` on the `carts` table. All the data in the column will be lost.
  - You are about to drop the column `budget` on the `recommendations` table. All the data in the column will be lost.
  - You are about to drop the column `cart_id` on the `recommendations` table. All the data in the column will be lost.
  - You are about to drop the column `category` on the `recommendations` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[cart_id,product_id]` on the table `cart_items` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[recommendation_id]` on the table `carts` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[groover_code]` on the table `carts` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[groover_code]` on the table `recommendations` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `updated_at` to the `carts` table without a default value. This is not possible if the table is not empty.
  - Added the required column `total_budget` to the `recommendations` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "carts" DROP CONSTRAINT "carts_user_id_fkey";

-- DropForeignKey
ALTER TABLE "recommendations" DROP CONSTRAINT "recommendations_user_id_fkey";

-- DropIndex
DROP INDEX "carts_cart_code_idx";

-- DropIndex
DROP INDEX "carts_cart_code_key";

-- AlterTable
ALTER TABLE "cart_items" ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "score_at_add" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "carts" DROP COLUMN "cart_code",
ADD COLUMN     "groover_code" TEXT,
ADD COLUMN     "is_public" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "item_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "recommendation_id" TEXT,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "view_count" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "brand" TEXT,
ADD COLUMN     "normalized_name" TEXT,
ADD COLUMN     "original_price" INTEGER,
ADD COLUMN     "popularity_score" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
ALTER COLUMN "source" SET DEFAULT 'manual';

-- AlterTable
ALTER TABLE "recommendations" DROP COLUMN "budget",
DROP COLUMN "cart_id",
DROP COLUMN "category",
ADD COLUMN     "ai_explanation" TEXT,
ADD COLUMN     "ai_tokens_used" INTEGER,
ADD COLUMN     "budget_profile_id" TEXT,
ADD COLUMN     "expires_at" TIMESTAMP(3),
ADD COLUMN     "groover_code" TEXT,
ADD COLUMN     "processing_time_ms" INTEGER,
ADD COLUMN     "request_payload" JSONB,
ADD COLUMN     "result_payload" JSONB,
ADD COLUMN     "saved_amount" INTEGER,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "total_budget" INTEGER NOT NULL,
ADD COLUMN     "total_items" INTEGER,
ADD COLUMN     "total_price" INTEGER,
ADD COLUMN     "used_ai" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "algorithm_version" SET DEFAULT 'v1';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "preferences" JSONB;

-- CreateTable
CREATE TABLE "budget_profiles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "total_budget" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'KRW',
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "categories" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "budget_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_sources" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "external_id" TEXT,
    "price" INTEGER NOT NULL,
    "url" TEXT,
    "search_query" TEXT,
    "availability" TEXT NOT NULL DEFAULT 'UNKNOWN',
    "last_checked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "groover_code_logs" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "encoded_data" TEXT NOT NULL,
    "checksum" TEXT NOT NULL,
    "creator_id" TEXT,
    "item_count" INTEGER NOT NULL,
    "total_price" INTEGER NOT NULL,
    "decode_count" INTEGER NOT NULL DEFAULT 0,
    "save_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "groover_code_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usage_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "action" TEXT NOT NULL,
    "metadata" JSONB,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usage_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_call_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "recommendation_id" TEXT,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "prompt_hash" TEXT NOT NULL,
    "input_tokens" INTEGER NOT NULL,
    "output_tokens" INTEGER NOT NULL,
    "total_tokens" INTEGER NOT NULL,
    "cost_usd" DOUBLE PRECISION,
    "latency_ms" INTEGER NOT NULL,
    "success" BOOLEAN NOT NULL,
    "error_message" TEXT,
    "cache_hit" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_call_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recommendation_cache" (
    "id" TEXT NOT NULL,
    "cache_key" TEXT NOT NULL,
    "result_payload" JSONB NOT NULL,
    "hit_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recommendation_cache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "budget_profiles_user_id_idx" ON "budget_profiles"("user_id");

-- CreateIndex
CREATE INDEX "product_sources_platform_idx" ON "product_sources"("platform");

-- CreateIndex
CREATE UNIQUE INDEX "product_sources_product_id_platform_key" ON "product_sources"("product_id", "platform");

-- CreateIndex
CREATE UNIQUE INDEX "groover_code_logs_code_key" ON "groover_code_logs"("code");

-- CreateIndex
CREATE INDEX "groover_code_logs_code_idx" ON "groover_code_logs"("code");

-- CreateIndex
CREATE INDEX "groover_code_logs_created_at_idx" ON "groover_code_logs"("created_at");

-- CreateIndex
CREATE INDEX "usage_logs_user_id_idx" ON "usage_logs"("user_id");

-- CreateIndex
CREATE INDEX "usage_logs_action_idx" ON "usage_logs"("action");

-- CreateIndex
CREATE INDEX "usage_logs_created_at_idx" ON "usage_logs"("created_at");

-- CreateIndex
CREATE INDEX "ai_call_logs_prompt_hash_idx" ON "ai_call_logs"("prompt_hash");

-- CreateIndex
CREATE INDEX "ai_call_logs_user_id_idx" ON "ai_call_logs"("user_id");

-- CreateIndex
CREATE INDEX "ai_call_logs_created_at_idx" ON "ai_call_logs"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "recommendation_cache_cache_key_key" ON "recommendation_cache"("cache_key");

-- CreateIndex
CREATE INDEX "recommendation_cache_cache_key_idx" ON "recommendation_cache"("cache_key");

-- CreateIndex
CREATE INDEX "recommendation_cache_expires_at_idx" ON "recommendation_cache"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "cart_items_cart_id_product_id_key" ON "cart_items"("cart_id", "product_id");

-- CreateIndex
CREATE UNIQUE INDEX "carts_recommendation_id_key" ON "carts"("recommendation_id");

-- CreateIndex
CREATE UNIQUE INDEX "carts_groover_code_key" ON "carts"("groover_code");

-- CreateIndex
CREATE INDEX "carts_groover_code_idx" ON "carts"("groover_code");

-- CreateIndex
CREATE INDEX "products_is_active_idx" ON "products"("is_active");

-- CreateIndex
CREATE INDEX "products_normalized_name_idx" ON "products"("normalized_name");

-- CreateIndex
CREATE UNIQUE INDEX "recommendations_groover_code_key" ON "recommendations"("groover_code");

-- CreateIndex
CREATE INDEX "recommendations_user_id_idx" ON "recommendations"("user_id");

-- CreateIndex
CREATE INDEX "recommendations_groover_code_idx" ON "recommendations"("groover_code");

-- CreateIndex
CREATE INDEX "recommendations_status_idx" ON "recommendations"("status");

-- AddForeignKey
ALTER TABLE "budget_profiles" ADD CONSTRAINT "budget_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_sources" ADD CONSTRAINT "product_sources_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carts" ADD CONSTRAINT "carts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recommendations" ADD CONSTRAINT "recommendations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recommendations" ADD CONSTRAINT "recommendations_budget_profile_id_fkey" FOREIGN KEY ("budget_profile_id") REFERENCES "budget_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
