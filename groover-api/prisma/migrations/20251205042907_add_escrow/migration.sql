-- CreateEnum
CREATE TYPE "WarningType" AS ENUM ('DIRECT_TRADE_ATTEMPT', 'SPAM', 'ABUSE', 'SCAM', 'OTHER');

-- CreateEnum
CREATE TYPE "AdDealStatus" AS ENUM ('PROPOSED', 'ACCEPTED', 'PAID', 'SUBMITTED', 'CONFIRMED', 'SETTLED', 'REJECTED', 'CANCELLED', 'REFUNDED', 'EXPIRED');

-- CreateTable
CREATE TABLE "DirectTradeAttempt" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "threadId" TEXT,
    "originalContent" TEXT NOT NULL,
    "detectedPatterns" JSONB NOT NULL,
    "detectedTypes" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DirectTradeAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserWarning" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "WarningType" NOT NULL,
    "reason" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserWarning_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdDeal" (
    "id" TEXT NOT NULL,
    "advertiserId" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "conversationId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "requirements" TEXT,
    "totalAmount" INTEGER NOT NULL,
    "platformFee" INTEGER NOT NULL,
    "creatorAmount" INTEGER NOT NULL,
    "status" "AdDealStatus" NOT NULL DEFAULT 'PROPOSED',
    "escrowAmount" INTEGER,
    "paymentId" TEXT,
    "paidAt" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3),
    "submissionUrl" TEXT,
    "submissionNote" TEXT,
    "confirmedAt" TIMESTAMP(3),
    "settledAt" TIMESTAMP(3),
    "submitDeadline" TIMESTAMP(3),
    "confirmDeadline" TIMESTAMP(3),
    "refundedAt" TIMESTAMP(3),
    "refundReason" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "cancelReason" TEXT,
    "rejectedAt" TIMESTAMP(3),
    "rejectReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdDeal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EscrowLog" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "fromStatus" TEXT,
    "toStatus" TEXT NOT NULL,
    "amount" INTEGER,
    "note" TEXT,
    "performedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EscrowLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "targetId" TEXT,
    "keyword" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyStat" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "pageViews" INTEGER NOT NULL DEFAULT 0,
    "postViews" INTEGER NOT NULL DEFAULT 0,
    "adImpressions" INTEGER NOT NULL DEFAULT 0,
    "adClicks" INTEGER NOT NULL DEFAULT 0,
    "partnerClicks" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "DailyStat_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DirectTradeAttempt_userId_idx" ON "DirectTradeAttempt"("userId");

-- CreateIndex
CREATE INDEX "DirectTradeAttempt_createdAt_idx" ON "DirectTradeAttempt"("createdAt");

-- CreateIndex
CREATE INDEX "UserWarning_userId_idx" ON "UserWarning"("userId");

-- CreateIndex
CREATE INDEX "AdDeal_advertiserId_idx" ON "AdDeal"("advertiserId");

-- CreateIndex
CREATE INDEX "AdDeal_creatorId_idx" ON "AdDeal"("creatorId");

-- CreateIndex
CREATE INDEX "AdDeal_status_idx" ON "AdDeal"("status");

-- CreateIndex
CREATE INDEX "EscrowLog_dealId_idx" ON "EscrowLog"("dealId");

-- CreateIndex
CREATE INDEX "EventLog_userId_type_idx" ON "EventLog"("userId", "type");

-- CreateIndex
CREATE INDEX "EventLog_createdAt_idx" ON "EventLog"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "DailyStat_userId_date_key" ON "DailyStat"("userId", "date");

-- AddForeignKey
ALTER TABLE "DirectTradeAttempt" ADD CONSTRAINT "DirectTradeAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserWarning" ADD CONSTRAINT "UserWarning_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdDeal" ADD CONSTRAINT "AdDeal_advertiserId_fkey" FOREIGN KEY ("advertiserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdDeal" ADD CONSTRAINT "AdDeal_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EscrowLog" ADD CONSTRAINT "EscrowLog_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "AdDeal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventLog" ADD CONSTRAINT "EventLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyStat" ADD CONSTRAINT "DailyStat_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
