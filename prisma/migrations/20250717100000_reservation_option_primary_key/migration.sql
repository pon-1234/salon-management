-- Align ReservationOption table with Prisma model (id primary key)
ALTER TABLE "ReservationOption"
ADD COLUMN IF NOT EXISTS "id" TEXT;

UPDATE "ReservationOption"
SET "id" = substr(md5(random()::text || clock_timestamp()::text), 1, 24)
WHERE "id" IS NULL;

ALTER TABLE "ReservationOption"
ALTER COLUMN "id" SET NOT NULL;

ALTER TABLE "ReservationOption"
DROP CONSTRAINT IF EXISTS "ReservationOption_pkey";

ALTER TABLE "ReservationOption"
ADD CONSTRAINT "ReservationOption_pkey" PRIMARY KEY ("id");

CREATE UNIQUE INDEX IF NOT EXISTS "ReservationOption_reservationId_optionId_key"
ON "ReservationOption"("reservationId","optionId");
