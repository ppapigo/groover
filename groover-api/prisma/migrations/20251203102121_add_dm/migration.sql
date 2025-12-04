-- CreateTable
CREATE TABLE "DmThread" (
    "id" TEXT NOT NULL,
    "user1Id" TEXT NOT NULL,
    "user2Id" TEXT NOT NULL,
    "lastMessage" TEXT,
    "lastMessageAt" TIMESTAMP(3),
    "unreadCountUser1" INTEGER NOT NULL DEFAULT 0,
    "unreadCountUser2" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DmThread_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DmMessage" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "messageType" TEXT NOT NULL DEFAULT 'text',
    "metadata" JSONB,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DmMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DmBlock" (
    "id" TEXT NOT NULL,
    "blockerId" TEXT NOT NULL,
    "blockedId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DmBlock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DmReport" (
    "id" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "reportedId" TEXT NOT NULL,
    "messageId" TEXT,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "DmReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DmThread_user1Id_idx" ON "DmThread"("user1Id");

-- CreateIndex
CREATE INDEX "DmThread_user2Id_idx" ON "DmThread"("user2Id");

-- CreateIndex
CREATE INDEX "DmThread_lastMessageAt_idx" ON "DmThread"("lastMessageAt");

-- CreateIndex
CREATE UNIQUE INDEX "DmThread_user1Id_user2Id_key" ON "DmThread"("user1Id", "user2Id");

-- CreateIndex
CREATE INDEX "DmMessage_threadId_idx" ON "DmMessage"("threadId");

-- CreateIndex
CREATE INDEX "DmMessage_senderId_idx" ON "DmMessage"("senderId");

-- CreateIndex
CREATE INDEX "DmMessage_createdAt_idx" ON "DmMessage"("createdAt");

-- CreateIndex
CREATE INDEX "DmBlock_blockerId_idx" ON "DmBlock"("blockerId");

-- CreateIndex
CREATE INDEX "DmBlock_blockedId_idx" ON "DmBlock"("blockedId");

-- CreateIndex
CREATE UNIQUE INDEX "DmBlock_blockerId_blockedId_key" ON "DmBlock"("blockerId", "blockedId");

-- CreateIndex
CREATE INDEX "DmReport_reporterId_idx" ON "DmReport"("reporterId");

-- CreateIndex
CREATE INDEX "DmReport_reportedId_idx" ON "DmReport"("reportedId");

-- CreateIndex
CREATE INDEX "DmReport_status_idx" ON "DmReport"("status");

-- AddForeignKey
ALTER TABLE "DmThread" ADD CONSTRAINT "DmThread_user1Id_fkey" FOREIGN KEY ("user1Id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DmThread" ADD CONSTRAINT "DmThread_user2Id_fkey" FOREIGN KEY ("user2Id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DmMessage" ADD CONSTRAINT "DmMessage_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "DmThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DmMessage" ADD CONSTRAINT "DmMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DmBlock" ADD CONSTRAINT "DmBlock_blockerId_fkey" FOREIGN KEY ("blockerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DmBlock" ADD CONSTRAINT "DmBlock_blockedId_fkey" FOREIGN KEY ("blockedId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DmReport" ADD CONSTRAINT "DmReport_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DmReport" ADD CONSTRAINT "DmReport_reportedId_fkey" FOREIGN KEY ("reportedId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DmReport" ADD CONSTRAINT "DmReport_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "DmMessage"("id") ON DELETE SET NULL ON UPDATE CASCADE;
