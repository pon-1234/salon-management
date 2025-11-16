-- Add schedule fields to StoreEventBanner for controlling publication window
ALTER TABLE "StoreEventBanner"
  ADD COLUMN "startDate" TIMESTAMP(3),
  ADD COLUMN "endDate" TIMESTAMP(3);
