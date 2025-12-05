-- AlterEnum
ALTER TYPE "TransactionType" ADD VALUE 'AD_REWARD';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "adMatchingSuspended" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "suspendedUntil" TIMESTAMP(3),
ADD COLUMN     "warningCount" INTEGER NOT NULL DEFAULT 0;
