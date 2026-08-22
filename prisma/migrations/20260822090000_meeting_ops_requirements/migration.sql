BEGIN;

ALTER TABLE "StoreSettings"
  ADD COLUMN IF NOT EXISTS "creditCardFeeRate" DECIMAL NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS "mediaCommentOverwrite" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "Cast"
  ADD COLUMN IF NOT EXISTS "mediaComment" TEXT,
  ADD COLUMN IF NOT EXISTS "mediaCommentSource" TEXT DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS "mediaSyncExcluded" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "scheduleTemplates" JSONB NOT NULL DEFAULT '[]';

ALTER TABLE "Reservation"
  ADD COLUMN IF NOT EXISTS "creditCardFee" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "SettlementPayment"
  ALTER COLUMN "method" SET DEFAULT '現金';

ALTER TABLE "SettlementPaymentReservation"
  ADD COLUMN IF NOT EXISTS "allocatedAmount" INTEGER NOT NULL DEFAULT 0;

DROP INDEX IF EXISTS "SettlementPaymentReservation_reservationId_key";

CREATE INDEX IF NOT EXISTS "SettlementPaymentReservation_reservationId_idx"
  ON "SettlementPaymentReservation"("reservationId");

UPDATE "SettlementPaymentReservation" spr
SET "allocatedAmount" = COALESCE(r."staffRevenue", 0)
FROM "Reservation" r
WHERE spr."reservationId" = r.id
  AND r."settlementStatus" = 'settled'
  AND spr."allocatedAmount" = 0;

COMMIT;
