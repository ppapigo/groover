-- CreateTable
CREATE TABLE "UserPostHistory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "viewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserPostHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserPostHistory_userId_idx" ON "UserPostHistory"("userId");

-- CreateIndex
CREATE INDEX "UserPostHistory_postId_idx" ON "UserPostHistory"("postId");

-- CreateIndex
CREATE UNIQUE INDEX "UserPostHistory_userId_postId_key" ON "UserPostHistory"("userId", "postId");

-- AddForeignKey
ALTER TABLE "UserPostHistory" ADD CONSTRAINT "UserPostHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPostHistory" ADD CONSTRAINT "UserPostHistory_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;
