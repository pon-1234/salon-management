-- Create Store table
CREATE TABLE "Store" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "displayName" TEXT NOT NULL,
  "slug" TEXT NOT NULL UNIQUE,
  "phone" TEXT,
  "email" TEXT,
  "timezone" TEXT NOT NULL DEFAULT 'Asia/Tokyo',
  "address" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Seed initial stores
INSERT INTO "Store" ("id", "name", "displayName", "slug", "phone", "email", "timezone", "address", "isActive")
VALUES
  ('ikebukuro', '池袋店', 'サロン池袋店', 'ikebukuro', '03-1234-5678', 'ikebukuro@example.com', 'Asia/Tokyo', '〒171-0021 東京都豊島区西池袋1-15-9 池袋ビル 5F', TRUE),
  ('shinjuku', '新宿店', 'サロン新宿店', 'shinjuku', '03-2345-6789', 'shinjuku@example.com', 'Asia/Tokyo', '〒160-0023 東京都新宿区西新宿1-13-12 新宿ビル 8F', TRUE),
  ('shibuya', '渋谷店', 'サロン渋谷店', 'shibuya', '03-3456-7890', 'shibuya@example.com', 'Asia/Tokyo', '〒150-0041 東京都渋谷区神南1-12-16 渋谷ビル 6F', TRUE)
ON CONFLICT ("id") DO NOTHING;

-- Add storeId columns with default to backfill existing data
ALTER TABLE "Cast" ADD COLUMN "storeId" TEXT NOT NULL DEFAULT 'ikebukuro';
ALTER TABLE "Reservation" ADD COLUMN "storeId" TEXT NOT NULL DEFAULT 'ikebukuro';
ALTER TABLE "CoursePrice" ADD COLUMN "storeId" TEXT NOT NULL DEFAULT 'ikebukuro';
ALTER TABLE "OptionPrice" ADD COLUMN "storeId" TEXT NOT NULL DEFAULT 'ikebukuro';
ALTER TABLE "AreaInfo" ADD COLUMN "storeId" TEXT NOT NULL DEFAULT 'ikebukuro';
ALTER TABLE "StationInfo" ADD COLUMN "storeId" TEXT NOT NULL DEFAULT 'ikebukuro';
ALTER TABLE "DesignationFee" ADD COLUMN "storeId" TEXT NOT NULL DEFAULT 'ikebukuro';
ALTER TABLE "StoreSettings" ADD COLUMN "storeId" TEXT NOT NULL DEFAULT 'ikebukuro';

-- Ensure any StoreSettings rows use the default store
UPDATE "StoreSettings" SET "storeId" = 'ikebukuro' WHERE "storeId" IS NULL;

-- Create indexes for storeId columns
CREATE INDEX "Cast_storeId_idx" ON "Cast"("storeId");
CREATE INDEX "Reservation_storeId_idx" ON "Reservation"("storeId");
CREATE INDEX "CoursePrice_storeId_idx" ON "CoursePrice"("storeId");
CREATE INDEX "OptionPrice_storeId_idx" ON "OptionPrice"("storeId");
CREATE INDEX "AreaInfo_storeId_idx" ON "AreaInfo"("storeId");
CREATE INDEX "StationInfo_storeId_idx" ON "StationInfo"("storeId");
CREATE INDEX "DesignationFee_storeId_idx" ON "DesignationFee"("storeId");
CREATE UNIQUE INDEX "StoreSettings_storeId_key" ON "StoreSettings"("storeId");

-- Add foreign key constraints
ALTER TABLE "Cast"
  ADD CONSTRAINT "Cast_storeId_fkey"
  FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Reservation"
  ADD CONSTRAINT "Reservation_storeId_fkey"
  FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CoursePrice"
  ADD CONSTRAINT "CoursePrice_storeId_fkey"
  FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OptionPrice"
  ADD CONSTRAINT "OptionPrice_storeId_fkey"
  FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AreaInfo"
  ADD CONSTRAINT "AreaInfo_storeId_fkey"
  FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StationInfo"
  ADD CONSTRAINT "StationInfo_storeId_fkey"
  FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DesignationFee"
  ADD CONSTRAINT "DesignationFee_storeId_fkey"
  FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StoreSettings"
  ADD CONSTRAINT "StoreSettings_storeId_fkey"
  FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Drop default values to enforce explicit store assignment going forward
ALTER TABLE "Cast" ALTER COLUMN "storeId" DROP DEFAULT;
ALTER TABLE "Reservation" ALTER COLUMN "storeId" DROP DEFAULT;
ALTER TABLE "CoursePrice" ALTER COLUMN "storeId" DROP DEFAULT;
ALTER TABLE "OptionPrice" ALTER COLUMN "storeId" DROP DEFAULT;
ALTER TABLE "AreaInfo" ALTER COLUMN "storeId" DROP DEFAULT;
ALTER TABLE "StationInfo" ALTER COLUMN "storeId" DROP DEFAULT;
ALTER TABLE "DesignationFee" ALTER COLUMN "storeId" DROP DEFAULT;
ALTER TABLE "StoreSettings" ALTER COLUMN "storeId" DROP DEFAULT;
