-- Add pointsUsed column to Reservation table
ALTER TABLE "Reservation"
  ADD COLUMN "pointsUsed" INTEGER NOT NULL DEFAULT 0;

-- Add point configuration columns to StoreSettings
ALTER TABLE "StoreSettings"
  ADD COLUMN "pointEarnRate" DECIMAL(65,30) NOT NULL DEFAULT 1,
  ADD COLUMN "pointExpirationMonths" INTEGER NOT NULL DEFAULT 12,
  ADD COLUMN "pointMinUsage" INTEGER NOT NULL DEFAULT 100;

-- Create CustomerPointHistory table
CREATE TABLE "CustomerPointHistory" (
  "id" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "amount" INTEGER NOT NULL,
  "description" TEXT NOT NULL,
  "relatedService" TEXT,
  "reservationId" TEXT,
  "balance" INTEGER NOT NULL,
  "expiresAt" TIMESTAMP(3),
  "isExpired" BOOLEAN NOT NULL DEFAULT false,
  "sourceHistoryId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CustomerPointHistory_pkey" PRIMARY KEY ("id")
);

-- Indexes and constraints for CustomerPointHistory
CREATE INDEX "CustomerPointHistory_customerId_idx" ON "CustomerPointHistory"("customerId");
CREATE INDEX "CustomerPointHistory_reservationId_idx" ON "CustomerPointHistory"("reservationId");
CREATE INDEX "idx_point_history_expiration" ON "CustomerPointHistory"("type", "expiresAt", "isExpired");
CREATE UNIQUE INDEX "unique_source_history" ON "CustomerPointHistory"("sourceHistoryId");

ALTER TABLE "CustomerPointHistory"
  ADD CONSTRAINT "CustomerPointHistory_customerId_fkey"
    FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "CustomerPointHistory_reservationId_fkey"
    FOREIGN KEY ("reservationId") REFERENCES "Reservation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
