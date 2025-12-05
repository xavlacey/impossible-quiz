-- CreateEnum
CREATE TYPE "PartyStatus" AS ENUM ('LOBBY', 'ACTIVE', 'FINISHED');

-- CreateTable
CREATE TABLE "Party" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "hostId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "PartyStatus" NOT NULL DEFAULT 'LOBBY',
    "currentQuestion" INTEGER NOT NULL DEFAULT 1,
    "totalQuestions" INTEGER NOT NULL DEFAULT 10,
    "correctAnswers" JSONB,

    CONSTRAINT "Party_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contestant" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "partyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Contestant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Answer" (
    "id" TEXT NOT NULL,
    "partyId" TEXT NOT NULL,
    "contestantId" TEXT NOT NULL,
    "questionNumber" INTEGER NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Answer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Party_code_key" ON "Party"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Party_hostId_key" ON "Party"("hostId");

-- CreateIndex
CREATE UNIQUE INDEX "Contestant_partyId_name_key" ON "Contestant"("partyId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Answer_partyId_contestantId_questionNumber_key" ON "Answer"("partyId", "contestantId", "questionNumber");

-- AddForeignKey
ALTER TABLE "Contestant" ADD CONSTRAINT "Contestant_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "Party"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Answer" ADD CONSTRAINT "Answer_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "Party"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Answer" ADD CONSTRAINT "Answer_contestantId_fkey" FOREIGN KEY ("contestantId") REFERENCES "Contestant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
