-- CreateTable
CREATE TABLE "CuratedQuiz" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "emoji" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CuratedQuiz_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CuratedQuizQuestion" (
    "id" UUID NOT NULL,
    "curatedQuizId" UUID NOT NULL,
    "questionId" UUID NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    "points" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "CuratedQuizQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CuratedQuiz_slug_key" ON "CuratedQuiz"("slug");

-- CreateIndex
CREATE INDEX "CuratedQuiz_isActive_idx" ON "CuratedQuiz"("isActive");

-- CreateIndex
CREATE INDEX "CuratedQuizQuestion_curatedQuizId_idx" ON "CuratedQuizQuestion"("curatedQuizId");

-- CreateIndex
CREATE INDEX "CuratedQuizQuestion_questionId_idx" ON "CuratedQuizQuestion"("questionId");

-- CreateIndex
CREATE UNIQUE INDEX "CuratedQuizQuestion_curatedQuizId_orderIndex_key" ON "CuratedQuizQuestion"("curatedQuizId", "orderIndex");

-- AddForeignKey
ALTER TABLE "CuratedQuizQuestion" ADD CONSTRAINT "CuratedQuizQuestion_curatedQuizId_fkey" FOREIGN KEY ("curatedQuizId") REFERENCES "CuratedQuiz"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CuratedQuizQuestion" ADD CONSTRAINT "CuratedQuizQuestion_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;
