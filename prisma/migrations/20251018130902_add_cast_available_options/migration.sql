-- AlterTable
ALTER TABLE "Cast" ADD COLUMN     "availableOptions" TEXT[] DEFAULT ARRAY[]::TEXT[];
