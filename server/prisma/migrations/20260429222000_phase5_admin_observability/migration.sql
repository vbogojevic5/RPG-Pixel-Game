-- AlterTable
ALTER TABLE "Player" ADD COLUMN "role" TEXT NOT NULL DEFAULT 'player';

-- CreateTable
CREATE TABLE "BattleRun" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "monsterId" TEXT NOT NULL,
    "monsterName" TEXT NOT NULL,
    "outcome" TEXT NOT NULL,
    "xpGained" INTEGER NOT NULL,
    "turns" INTEGER NOT NULL,
    "battleLog" JSONB NOT NULL,
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BattleRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminAuditLog" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BattleRun_playerId_endedAt_idx" ON "BattleRun"("playerId", "endedAt");

-- CreateIndex
CREATE INDEX "BattleRun_monsterId_outcome_idx" ON "BattleRun"("monsterId", "outcome");

-- CreateIndex
CREATE INDEX "AdminAuditLog_adminId_createdAt_idx" ON "AdminAuditLog"("adminId", "createdAt");

-- CreateIndex
CREATE INDEX "AdminAuditLog_entityType_entityId_idx" ON "AdminAuditLog"("entityType", "entityId");

-- AddForeignKey
ALTER TABLE "BattleRun" ADD CONSTRAINT "BattleRun_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminAuditLog" ADD CONSTRAINT "AdminAuditLog_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;
