BEGIN;

LOCK TABLE "Store" IN SHARE ROW EXCLUSIVE MODE;
LOCK TABLE "AreaInfo" IN SHARE ROW EXCLUSIVE MODE;
LOCK TABLE "HotelSettings" IN SHARE ROW EXCLUSIVE MODE;
LOCK TABLE "Reservation" IN SHARE ROW EXCLUSIVE MODE;

ALTER TABLE "HotelSettings"
  ADD COLUMN "storeId" TEXT,
  ADD COLUMN "legacyId" TEXT,
  ADD COLUMN "station" TEXT,
  ADD COLUMN "rawText" TEXT,
  ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "displayOrder" INTEGER NOT NULL DEFAULT 0,
  ALTER COLUMN "area" DROP NOT NULL,
  ALTER COLUMN "roomCount" DROP NOT NULL,
  ALTER COLUMN "hourlyRate" DROP NOT NULL,
  ALTER COLUMN "address" DROP NOT NULL,
  ALTER COLUMN "phone" DROP NOT NULL,
  ALTER COLUMN "checkInTime" DROP NOT NULL,
  ALTER COLUMN "checkOutTime" DROP NOT NULL,
  ALTER COLUMN "amenities" SET DEFAULT ARRAY[]::TEXT[];

UPDATE "HotelSettings"
SET "amenities" = ARRAY[]::TEXT[]
WHERE "amenities" IS NULL;

ALTER TABLE "HotelSettings"
  ALTER COLUMN "amenities" SET NOT NULL;

DO $migration$
DECLARE
  store_count INTEGER;
  only_store_id TEXT;
BEGIN
  IF EXISTS (SELECT 1 FROM "HotelSettings" WHERE "storeId" IS NULL) THEN
    store_count := (SELECT COUNT(*) FROM "Store");

    IF store_count <> 1 THEN
      RAISE EXCEPTION 'cannot assign existing hotels to one store unambiguously: found % stores', store_count;
    END IF;

    SELECT "id" INTO STRICT only_store_id FROM "Store";
    UPDATE "HotelSettings"
    SET "storeId" = only_store_id
    WHERE "storeId" IS NULL;
  END IF;
END
$migration$;

ALTER TABLE "HotelSettings"
  ALTER COLUMN "storeId" SET NOT NULL,
  ADD CONSTRAINT "HotelSettings_hotelName_nonempty_check"
    CHECK (btrim("hotelName") <> ''),
  ADD CONSTRAINT "HotelSettings_roomCount_nonnegative_check"
    CHECK ("roomCount" IS NULL OR "roomCount" >= 0),
  ADD CONSTRAINT "HotelSettings_hourlyRate_nonnegative_check"
    CHECK ("hourlyRate" IS NULL OR "hourlyRate" >= 0),
  ADD CONSTRAINT "HotelSettings_displayOrder_nonnegative_check"
    CHECK ("displayOrder" >= 0);

ALTER TABLE "Reservation"
  ADD COLUMN "hotelId" TEXT,
  ADD COLUMN "hotelExpense" INTEGER NOT NULL DEFAULT 0,
  ADD CONSTRAINT "Reservation_hotelExpense_nonnegative_check"
    CHECK ("hotelExpense" >= 0);

CREATE TABLE "HotelServiceArea" (
  "id" TEXT NOT NULL,
  "storeId" TEXT NOT NULL,
  "hotelId" TEXT NOT NULL,
  "areaId" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "displayOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "HotelServiceArea_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "HotelServiceArea_displayOrder_nonnegative_check"
    CHECK ("displayOrder" >= 0)
);

CREATE TABLE "HotelRate" (
  "id" TEXT NOT NULL,
  "hotelId" TEXT NOT NULL,
  "label" TEXT,
  "durationMinutes" INTEGER,
  "amount" INTEGER,
  "rawText" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "displayOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "HotelRate_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "HotelRate_amount_nonnegative_check"
    CHECK ("amount" IS NULL OR "amount" >= 0),
  CONSTRAINT "HotelRate_duration_positive_check"
    CHECK ("durationMinutes" IS NULL OR "durationMinutes" > 0),
  CONSTRAINT "HotelRate_displayOrder_nonnegative_check"
    CHECK ("displayOrder" >= 0),
  CONSTRAINT "HotelRate_value_present_check"
    CHECK ("amount" IS NOT NULL OR NULLIF(btrim("rawText"), '') IS NOT NULL)
);

CREATE UNIQUE INDEX "AreaInfo_id_storeId_key"
  ON "AreaInfo"("id", "storeId");
CREATE UNIQUE INDEX "HotelSettings_id_storeId_key"
  ON "HotelSettings"("id", "storeId");
CREATE UNIQUE INDEX "HotelSettings_storeId_legacyId_key"
  ON "HotelSettings"("storeId", "legacyId");
CREATE INDEX "HotelSettings_storeId_isActive_displayOrder_idx"
  ON "HotelSettings"("storeId", "isActive", "displayOrder");
CREATE UNIQUE INDEX "HotelServiceArea_hotelId_areaId_key"
  ON "HotelServiceArea"("hotelId", "areaId");
CREATE INDEX "HotelServiceArea_hotelId_isActive_displayOrder_idx"
  ON "HotelServiceArea"("hotelId", "isActive", "displayOrder");
CREATE INDEX "HotelServiceArea_areaId_storeId_idx"
  ON "HotelServiceArea"("areaId", "storeId");
CREATE INDEX "HotelRate_hotelId_isActive_displayOrder_idx"
  ON "HotelRate"("hotelId", "isActive", "displayOrder");
CREATE INDEX "Reservation_hotelId_storeId_idx"
  ON "Reservation"("hotelId", "storeId");

ALTER TABLE "HotelSettings"
  ADD CONSTRAINT "HotelSettings_storeId_fkey"
  FOREIGN KEY ("storeId") REFERENCES "Store"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "HotelServiceArea"
  ADD CONSTRAINT "HotelServiceArea_hotelId_storeId_fkey"
  FOREIGN KEY ("hotelId", "storeId") REFERENCES "HotelSettings"("id", "storeId")
  ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "HotelServiceArea_areaId_storeId_fkey"
  FOREIGN KEY ("areaId", "storeId") REFERENCES "AreaInfo"("id", "storeId")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "HotelRate"
  ADD CONSTRAINT "HotelRate_hotelId_fkey"
  FOREIGN KEY ("hotelId") REFERENCES "HotelSettings"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Reservation"
  ADD CONSTRAINT "Reservation_hotelId_storeId_fkey"
  FOREIGN KEY ("hotelId", "storeId") REFERENCES "HotelSettings"("id", "storeId")
  ON DELETE RESTRICT ON UPDATE CASCADE;

COMMIT;
