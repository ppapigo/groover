/*
  Warnings:

  - The values [DEAL_PROPOSED,DEAL_ACCEPTED,DEAL_REJECTED,DEAL_PAID,DEAL_SUBMITTED,DEAL_CONFIRMED,DEAL_SETTLED,DEAL_DEADLINE,SUSPENSION_NOTICE,WITHDRAWAL_COMPLETE] on the enum `NotificationType` will be removed. If these variants are still used in the database, this will fail.
  - The values [DIRECT_TRADE_ATTEMPT] on the enum `WarningType` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `isPushed` on the `Notification` table. All the data in the column will be lost.
  - You are about to drop the column `pushedAt` on the `Notification` table. All the data in the column will be lost.
  - You are about to drop the column `hasAffiliateLinks` on the `Post` table. All the data in the column will be lost.
  - You are about to drop the column `adMatchingSuspended` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `preferences` on the `users` table. All the data in the column will be lost.
  - You are about to drop the `AdDeal` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `AdPayment` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `AdProposal` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Conversation` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ConversationMessage` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `DailyStat` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `DirectTradeAttempt` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `EscrowLog` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PostProduct` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `RecommendationHistory` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Settlement` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `UserStatsCache` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Wallet` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `WalletTransaction` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Withdrawal` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ai_call_logs` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `budget_profiles` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `cart_items` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `carts` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `groover_code_logs` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `product_sources` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `products` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `recommendation_cache` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `recommendations` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `usage_logs` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "NotificationType_new" AS ENUM ('NEW_FOLLOWER', 'POST_LIKED', 'POST_COMMENTED', 'DISCUSSION_REPLY', 'NEW_MESSAGE', 'TAG_NEW_POST', 'SYSTEM_NOTICE', 'WARNING_RECEIVED');
ALTER TABLE "Notification" ALTER COLUMN "type" TYPE "NotificationType_new" USING ("type"::text::"NotificationType_new");
ALTER TYPE "NotificationType" RENAME TO "NotificationType_old";
ALTER TYPE "NotificationType_new" RENAME TO "NotificationType";
DROP TYPE "NotificationType_old";
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "WarningType_new" AS ENUM ('SPAM', 'ABUSE', 'SCAM', 'OTHER');
ALTER TABLE "UserWarning" ALTER COLUMN "type" TYPE "WarningType_new" USING ("type"::text::"WarningType_new");
ALTER TYPE "WarningType" RENAME TO "WarningType_old";
ALTER TYPE "WarningType_new" RENAME TO "WarningType";
DROP TYPE "WarningType_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "AdDeal" DROP CONSTRAINT "AdDeal_advertiserId_fkey";

-- DropForeignKey
ALTER TABLE "AdDeal" DROP CONSTRAINT "AdDeal_creatorId_fkey";

-- DropForeignKey
ALTER TABLE "AdPayment" DROP CONSTRAINT "AdPayment_payerId_fkey";

-- DropForeignKey
ALTER TABLE "AdPayment" DROP CONSTRAINT "AdPayment_proposalId_fkey";

-- DropForeignKey
ALTER TABLE "AdProposal" DROP CONSTRAINT "AdProposal_advertiserId_fkey";

-- DropForeignKey
ALTER TABLE "AdProposal" DROP CONSTRAINT "AdProposal_creatorId_fkey";

-- DropForeignKey
ALTER TABLE "AdProposal" DROP CONSTRAINT "AdProposal_threadId_fkey";

-- DropForeignKey
ALTER TABLE "Conversation" DROP CONSTRAINT "Conversation_userId_fkey";

-- DropForeignKey
ALTER TABLE "ConversationMessage" DROP CONSTRAINT "ConversationMessage_conversationId_fkey";

-- DropForeignKey
ALTER TABLE "DailyStat" DROP CONSTRAINT "DailyStat_userId_fkey";

-- DropForeignKey
ALTER TABLE "DirectTradeAttempt" DROP CONSTRAINT "DirectTradeAttempt_userId_fkey";

-- DropForeignKey
ALTER TABLE "EscrowLog" DROP CONSTRAINT "EscrowLog_dealId_fkey";

-- DropForeignKey
ALTER TABLE "PostProduct" DROP CONSTRAINT "PostProduct_postId_fkey";

-- DropForeignKey
ALTER TABLE "RecommendationHistory" DROP CONSTRAINT "RecommendationHistory_recommendationId_fkey";

-- DropForeignKey
ALTER TABLE "Settlement" DROP CONSTRAINT "Settlement_paymentId_fkey";

-- DropForeignKey
ALTER TABLE "Settlement" DROP CONSTRAINT "Settlement_recipientId_fkey";

-- DropForeignKey
ALTER TABLE "UserStatsCache" DROP CONSTRAINT "UserStatsCache_userId_fkey";

-- DropForeignKey
ALTER TABLE "Wallet" DROP CONSTRAINT "Wallet_userId_fkey";

-- DropForeignKey
ALTER TABLE "WalletTransaction" DROP CONSTRAINT "WalletTransaction_walletId_fkey";

-- DropForeignKey
ALTER TABLE "Withdrawal" DROP CONSTRAINT "Withdrawal_userId_fkey";

-- DropForeignKey
ALTER TABLE "Withdrawal" DROP CONSTRAINT "Withdrawal_walletId_fkey";

-- DropForeignKey
ALTER TABLE "budget_profiles" DROP CONSTRAINT "budget_profiles_user_id_fkey";

-- DropForeignKey
ALTER TABLE "cart_items" DROP CONSTRAINT "cart_items_cart_id_fkey";

-- DropForeignKey
ALTER TABLE "cart_items" DROP CONSTRAINT "cart_items_product_id_fkey";

-- DropForeignKey
ALTER TABLE "carts" DROP CONSTRAINT "carts_user_id_fkey";

-- DropForeignKey
ALTER TABLE "product_sources" DROP CONSTRAINT "product_sources_product_id_fkey";

-- DropForeignKey
ALTER TABLE "recommendations" DROP CONSTRAINT "recommendations_budget_profile_id_fkey";

-- DropForeignKey
ALTER TABLE "recommendations" DROP CONSTRAINT "recommendations_user_id_fkey";

-- DropIndex
DROP INDEX "Post_tags_idx";

-- DropIndex
DROP INDEX "PostShare_postId_createdAt_idx";

-- AlterTable
ALTER TABLE "Notification" DROP COLUMN "isPushed",
DROP COLUMN "pushedAt";

-- AlterTable
ALTER TABLE "Post" DROP COLUMN "hasAffiliateLinks",
ADD COLUMN     "commentCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "metadata" JSONB;

-- AlterTable
ALTER TABLE "users" DROP COLUMN "adMatchingSuspended",
DROP COLUMN "preferences",
ADD COLUMN     "bio" TEXT;

-- DropTable
DROP TABLE "AdDeal";

-- DropTable
DROP TABLE "AdPayment";

-- DropTable
DROP TABLE "AdProposal";

-- DropTable
DROP TABLE "Conversation";

-- DropTable
DROP TABLE "ConversationMessage";

-- DropTable
DROP TABLE "DailyStat";

-- DropTable
DROP TABLE "DirectTradeAttempt";

-- DropTable
DROP TABLE "EscrowLog";

-- DropTable
DROP TABLE "PostProduct";

-- DropTable
DROP TABLE "RecommendationHistory";

-- DropTable
DROP TABLE "Settlement";

-- DropTable
DROP TABLE "UserStatsCache";

-- DropTable
DROP TABLE "Wallet";

-- DropTable
DROP TABLE "WalletTransaction";

-- DropTable
DROP TABLE "Withdrawal";

-- DropTable
DROP TABLE "ai_call_logs";

-- DropTable
DROP TABLE "budget_profiles";

-- DropTable
DROP TABLE "cart_items";

-- DropTable
DROP TABLE "carts";

-- DropTable
DROP TABLE "groover_code_logs";

-- DropTable
DROP TABLE "product_sources";

-- DropTable
DROP TABLE "products";

-- DropTable
DROP TABLE "recommendation_cache";

-- DropTable
DROP TABLE "recommendations";

-- DropTable
DROP TABLE "usage_logs";

-- DropEnum
DROP TYPE "AdDealStatus";

-- DropEnum
DROP TYPE "AdProposalStatus";

-- DropEnum
DROP TYPE "PaymentStatus";

-- DropEnum
DROP TYPE "SettlementStatus";

-- DropEnum
DROP TYPE "TransactionType";

-- DropEnum
DROP TYPE "WithdrawalStatus";

-- CreateTable
CREATE TABLE "Follow" (
    "id" TEXT NOT NULL,
    "followerId" TEXT NOT NULL,
    "followingId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Follow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeedTag" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "category" TEXT,
    "description" TEXT,
    "iconEmoji" TEXT,
    "postCount" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeedTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FreeTag" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "useCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FreeTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TagMapping" (
    "id" TEXT NOT NULL,
    "freeTagId" TEXT NOT NULL,
    "feedTagId" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TagMapping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserPinnedTag" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "feedTagId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserPinnedTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PostFeedTag" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "feedTagId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PostFeedTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PostFreeTag" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "freeTagId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PostFreeTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Comment" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "parentId" TEXT,
    "likeCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Discussion" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "feedTagId" TEXT,
    "hasVote" BOOLEAN NOT NULL DEFAULT false,
    "voteOptions" JSONB,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "commentCount" INTEGER NOT NULL DEFAULT 0,
    "voteCount" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Discussion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiscussionComment" (
    "id" TEXT NOT NULL,
    "discussionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "parentId" TEXT,
    "likeCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DiscussionComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiscussionVote" (
    "id" TEXT NOT NULL,
    "discussionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "optionIndex" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DiscussionVote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Follow_followerId_idx" ON "Follow"("followerId");

-- CreateIndex
CREATE INDEX "Follow_followingId_idx" ON "Follow"("followingId");

-- CreateIndex
CREATE UNIQUE INDEX "Follow_followerId_followingId_key" ON "Follow"("followerId", "followingId");

-- CreateIndex
CREATE UNIQUE INDEX "FeedTag_name_key" ON "FeedTag"("name");

-- CreateIndex
CREATE UNIQUE INDEX "FeedTag_slug_key" ON "FeedTag"("slug");

-- CreateIndex
CREATE INDEX "FeedTag_category_idx" ON "FeedTag"("category");

-- CreateIndex
CREATE INDEX "FeedTag_postCount_idx" ON "FeedTag"("postCount");

-- CreateIndex
CREATE UNIQUE INDEX "FreeTag_name_key" ON "FreeTag"("name");

-- CreateIndex
CREATE INDEX "FreeTag_useCount_idx" ON "FreeTag"("useCount");

-- CreateIndex
CREATE INDEX "TagMapping_freeTagId_idx" ON "TagMapping"("freeTagId");

-- CreateIndex
CREATE INDEX "TagMapping_feedTagId_idx" ON "TagMapping"("feedTagId");

-- CreateIndex
CREATE UNIQUE INDEX "TagMapping_freeTagId_feedTagId_key" ON "TagMapping"("freeTagId", "feedTagId");

-- CreateIndex
CREATE INDEX "UserPinnedTag_userId_idx" ON "UserPinnedTag"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserPinnedTag_userId_feedTagId_key" ON "UserPinnedTag"("userId", "feedTagId");

-- CreateIndex
CREATE INDEX "PostFeedTag_postId_idx" ON "PostFeedTag"("postId");

-- CreateIndex
CREATE INDEX "PostFeedTag_feedTagId_idx" ON "PostFeedTag"("feedTagId");

-- CreateIndex
CREATE UNIQUE INDEX "PostFeedTag_postId_feedTagId_key" ON "PostFeedTag"("postId", "feedTagId");

-- CreateIndex
CREATE INDEX "PostFreeTag_postId_idx" ON "PostFreeTag"("postId");

-- CreateIndex
CREATE INDEX "PostFreeTag_freeTagId_idx" ON "PostFreeTag"("freeTagId");

-- CreateIndex
CREATE UNIQUE INDEX "PostFreeTag_postId_freeTagId_key" ON "PostFreeTag"("postId", "freeTagId");

-- CreateIndex
CREATE INDEX "Comment_postId_idx" ON "Comment"("postId");

-- CreateIndex
CREATE INDEX "Comment_userId_idx" ON "Comment"("userId");

-- CreateIndex
CREATE INDEX "Comment_parentId_idx" ON "Comment"("parentId");

-- CreateIndex
CREATE INDEX "Discussion_userId_idx" ON "Discussion"("userId");

-- CreateIndex
CREATE INDEX "Discussion_feedTagId_idx" ON "Discussion"("feedTagId");

-- CreateIndex
CREATE INDEX "Discussion_status_idx" ON "Discussion"("status");

-- CreateIndex
CREATE INDEX "Discussion_createdAt_idx" ON "Discussion"("createdAt");

-- CreateIndex
CREATE INDEX "DiscussionComment_discussionId_idx" ON "DiscussionComment"("discussionId");

-- CreateIndex
CREATE INDEX "DiscussionComment_userId_idx" ON "DiscussionComment"("userId");

-- CreateIndex
CREATE INDEX "DiscussionComment_parentId_idx" ON "DiscussionComment"("parentId");

-- CreateIndex
CREATE INDEX "DiscussionVote_discussionId_idx" ON "DiscussionVote"("discussionId");

-- CreateIndex
CREATE UNIQUE INDEX "DiscussionVote_discussionId_userId_key" ON "DiscussionVote"("discussionId", "userId");

-- CreateIndex
CREATE INDEX "PostShare_postId_idx" ON "PostShare"("postId");

-- AddForeignKey
ALTER TABLE "Follow" ADD CONSTRAINT "Follow_followerId_fkey" FOREIGN KEY ("followerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Follow" ADD CONSTRAINT "Follow_followingId_fkey" FOREIGN KEY ("followingId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TagMapping" ADD CONSTRAINT "TagMapping_freeTagId_fkey" FOREIGN KEY ("freeTagId") REFERENCES "FreeTag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TagMapping" ADD CONSTRAINT "TagMapping_feedTagId_fkey" FOREIGN KEY ("feedTagId") REFERENCES "FeedTag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPinnedTag" ADD CONSTRAINT "UserPinnedTag_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPinnedTag" ADD CONSTRAINT "UserPinnedTag_feedTagId_fkey" FOREIGN KEY ("feedTagId") REFERENCES "FeedTag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostFeedTag" ADD CONSTRAINT "PostFeedTag_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostFeedTag" ADD CONSTRAINT "PostFeedTag_feedTagId_fkey" FOREIGN KEY ("feedTagId") REFERENCES "FeedTag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostFreeTag" ADD CONSTRAINT "PostFreeTag_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostFreeTag" ADD CONSTRAINT "PostFreeTag_freeTagId_fkey" FOREIGN KEY ("freeTagId") REFERENCES "FreeTag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Discussion" ADD CONSTRAINT "Discussion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Discussion" ADD CONSTRAINT "Discussion_feedTagId_fkey" FOREIGN KEY ("feedTagId") REFERENCES "FeedTag"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscussionComment" ADD CONSTRAINT "DiscussionComment_discussionId_fkey" FOREIGN KEY ("discussionId") REFERENCES "Discussion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscussionComment" ADD CONSTRAINT "DiscussionComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscussionComment" ADD CONSTRAINT "DiscussionComment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "DiscussionComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscussionVote" ADD CONSTRAINT "DiscussionVote_discussionId_fkey" FOREIGN KEY ("discussionId") REFERENCES "Discussion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscussionVote" ADD CONSTRAINT "DiscussionVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
