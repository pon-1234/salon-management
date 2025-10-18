-- Adjust OptionPrice.updatedAt to use CURRENT_TIMESTAMP by default
ALTER TABLE "OptionPrice"
  ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- Ensure ReservationOption.optionId is required and enforce uniqueness per reservation
ALTER TABLE "ReservationOption"
  DROP CONSTRAINT IF EXISTS "ReservationOption_optionId_fkey";

ALTER TABLE "ReservationOption"
  ALTER COLUMN "optionId" SET NOT NULL;

DROP INDEX IF EXISTS "ReservationOption_reservationId_idx";

CREATE UNIQUE INDEX IF NOT EXISTS "ReservationOption_reservationId_optionId_key"
  ON "ReservationOption"("reservationId", "optionId");

ALTER TABLE "ReservationOption"
  ADD CONSTRAINT "ReservationOption_optionId_fkey"
  FOREIGN KEY ("optionId") REFERENCES "OptionPrice"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
