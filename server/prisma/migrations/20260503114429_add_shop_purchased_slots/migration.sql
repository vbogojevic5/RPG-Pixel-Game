-- AlterTable
ALTER TABLE "GameSave" ADD COLUMN     "shopPurchasedSlots" TEXT[] DEFAULT ARRAY[]::TEXT[];
