-- AlterTable
ALTER TABLE "StoreSettings" ADD COLUMN "hourlyGuaranteeAmount" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "CastLedgerEntry" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "castId" TEXT NOT NULL,
    "sourceTable" TEXT NOT NULL,
    "sourceKey" TEXT NOT NULL,
    "businessMonth" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "direction" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "notes" TEXT NOT NULL DEFAULT '',
    "handledBy" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CastLedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CastLedgerEntry_storeId_sourceTable_sourceKey_key" ON "CastLedgerEntry"("storeId", "sourceTable", "sourceKey");

-- CreateIndex
CREATE INDEX "CastLedgerEntry_storeId_businessMonth_idx" ON "CastLedgerEntry"("storeId", "businessMonth");

-- CreateIndex
CREATE INDEX "CastLedgerEntry_castId_businessMonth_idx" ON "CastLedgerEntry"("castId", "businessMonth");

-- AddForeignKey
ALTER TABLE "CastLedgerEntry" ADD CONSTRAINT "CastLedgerEntry_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CastLedgerEntry" ADD CONSTRAINT "CastLedgerEntry_castId_fkey" FOREIGN KEY ("castId") REFERENCES "Cast"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
