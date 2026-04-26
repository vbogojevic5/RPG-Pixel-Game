-- CreateTable
CREATE TABLE "Player" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Player_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Constant" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,

    CONSTRAINT "Constant_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "HeroConfig" (
    "id" TEXT NOT NULL DEFAULT 'hero',
    "name" TEXT NOT NULL,
    "sprite" TEXT,
    "baseStats" JSONB NOT NULL,
    "defaultMoves" TEXT[],

    CONSTRAINT "HeroConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Move" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "baseValue" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "effect" JSONB,
    "statusEffect" JSONB,

    CONSTRAINT "Move_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Monster" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "stats" JSONB NOT NULL,
    "xpReward" INTEGER NOT NULL,
    "sprite" TEXT,

    CONSTRAINT "Monster_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MonsterMove" (
    "monsterId" TEXT NOT NULL,
    "moveId" TEXT NOT NULL,
    "slot" INTEGER NOT NULL,

    CONSTRAINT "MonsterMove_pkey" PRIMARY KEY ("monsterId","moveId")
);

-- CreateTable
CREATE TABLE "GameSave" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "heroState" JSONB NOT NULL,
    "defeatedMonsterIds" TEXT[],
    "runStats" JSONB NOT NULL,
    "lastScreen" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GameSave_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Player_username_key" ON "Player"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Monster_order_key" ON "Monster"("order");

-- CreateIndex
CREATE INDEX "MonsterMove_monsterId_slot_idx" ON "MonsterMove"("monsterId", "slot");

-- CreateIndex
CREATE INDEX "GameSave_playerId_updatedAt_idx" ON "GameSave"("playerId", "updatedAt");

-- AddForeignKey
ALTER TABLE "MonsterMove" ADD CONSTRAINT "MonsterMove_monsterId_fkey" FOREIGN KEY ("monsterId") REFERENCES "Monster"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonsterMove" ADD CONSTRAINT "MonsterMove_moveId_fkey" FOREIGN KEY ("moveId") REFERENCES "Move"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameSave" ADD CONSTRAINT "GameSave_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;
