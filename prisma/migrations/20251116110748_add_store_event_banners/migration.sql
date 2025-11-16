-- Create store event banner table for managing top page campaign banners
CREATE TABLE "StoreEventBanner" (
  "id" TEXT NOT NULL,
  "storeId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "imageUrl" TEXT NOT NULL,
  "mobileImageUrl" TEXT,
  "link" TEXT,
  "displayOrder" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StoreEventBanner_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "StoreEventBanner_storeId_idx" ON "StoreEventBanner"("storeId");

ALTER TABLE "StoreEventBanner"
  ADD CONSTRAINT "StoreEventBanner_storeId_fkey"
  FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
