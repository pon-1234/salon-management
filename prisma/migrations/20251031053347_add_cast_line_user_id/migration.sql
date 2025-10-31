-- AlterTable
ALTER TABLE "Cast" ADD COLUMN     "lineUserId" TEXT;

-- AlterTable
ALTER TABLE "Store" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- CreateIndex
CREATE INDEX "StoreSettings_storeId_idx" ON "StoreSettings"("storeId");
