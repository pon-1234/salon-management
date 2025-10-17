-- Add snapshot fields to ReservationOption and allow options to be archived while keeping history

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Drop existing primary key to introduce surrogate key
ALTER TABLE "ReservationOption" DROP CONSTRAINT "ReservationOption_pkey";

-- Add new columns
ALTER TABLE "ReservationOption"
  ADD COLUMN "id" TEXT,
  ADD COLUMN "optionName" TEXT,
  ADD COLUMN "optionPrice" INTEGER,
  ADD COLUMN "storeShare" INTEGER,
  ADD COLUMN "castShare" INTEGER;

-- Populate new columns with existing data
UPDATE "ReservationOption" ro
SET
  "id" = gen_random_uuid()::text,
  "optionName" = op."name",
  "optionPrice" = op."price",
  "storeShare" = op."storeShare",
  "castShare" = op."castShare"
FROM "OptionPrice" op
WHERE ro."optionId" = op."id";

-- Ensure columns are not null where required
ALTER TABLE "ReservationOption"
  ALTER COLUMN "id" SET NOT NULL,
  ALTER COLUMN "optionName" SET NOT NULL,
  ALTER COLUMN "optionPrice" SET NOT NULL;

-- Recreate primary key and index
ALTER TABLE "ReservationOption" ADD CONSTRAINT "ReservationOption_pkey" PRIMARY KEY ("id");
CREATE INDEX "ReservationOption_reservationId_idx" ON "ReservationOption" ("reservationId");

-- Allow optionId to be nullable and re-create foreign key with SET NULL on delete
ALTER TABLE "ReservationOption" DROP CONSTRAINT "ReservationOption_optionId_fkey";
ALTER TABLE "ReservationOption" ALTER COLUMN "optionId" DROP NOT NULL;
ALTER TABLE "ReservationOption"
  ADD CONSTRAINT "ReservationOption_optionId_fkey"
  FOREIGN KEY ("optionId") REFERENCES "OptionPrice"("id") ON DELETE SET NULL ON UPDATE CASCADE;
