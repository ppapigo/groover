/*
  Warnings:

  - You are about to drop the column `last_updated` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `platform` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `url` on the `products` table. All the data in the column will be lost.
  - Added the required column `source` to the `products` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `products` table without a default value. This is not possible if the table is not empty.
  - Made the column `category` on table `products` required. This step will fail if there are existing NULL values in that column.
  - Made the column `review_count` on table `products` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "recommendations" DROP CONSTRAINT "recommendations_cart_id_fkey";

-- DropIndex
DROP INDEX "products_category_idx";

-- DropIndex
DROP INDEX "products_price_idx";

-- AlterTable
ALTER TABLE "carts" ALTER COLUMN "total_price" SET DEFAULT 0;

-- AlterTable
ALTER TABLE "products" DROP COLUMN "last_updated",
DROP COLUMN "platform",
DROP COLUMN "url",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "last_synced" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "source" TEXT NOT NULL,
ADD COLUMN     "source_url" TEXT,
ADD COLUMN     "subcategory" TEXT,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "category" SET NOT NULL,
ALTER COLUMN "review_count" SET NOT NULL,
ALTER COLUMN "review_count" SET DEFAULT 0;

-- CreateIndex
CREATE INDEX "products_category_price_idx" ON "products"("category", "price");

-- CreateIndex
CREATE INDEX "products_source_idx" ON "products"("source");

-- CreateIndex
CREATE INDEX "products_rating_review_count_idx" ON "products"("rating", "review_count");
