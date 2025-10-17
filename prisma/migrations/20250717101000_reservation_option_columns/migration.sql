-- Add missing ReservationOption columns to align with Prisma model
ALTER TABLE "ReservationOption"
ADD COLUMN IF NOT EXISTS "optionName" TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS "optionPrice" INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS "storeShare" INTEGER,
ADD COLUMN IF NOT EXISTS "castShare" INTEGER;

UPDATE "ReservationOption"
SET
  "optionName" = COALESCE("optionName", ''),
  "optionPrice" = COALESCE("optionPrice", 0);

ALTER TABLE "ReservationOption"
ALTER COLUMN "optionName" SET NOT NULL,
ALTER COLUMN "optionPrice" SET NOT NULL,
ALTER COLUMN "optionName" DROP DEFAULT,
ALTER COLUMN "optionPrice" DROP DEFAULT;
