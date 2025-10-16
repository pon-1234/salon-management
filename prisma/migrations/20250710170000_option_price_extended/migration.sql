-- Extend OptionPrice with detailed fields for option management
ALTER TABLE "OptionPrice"
  ADD COLUMN "description" TEXT,
  ADD COLUMN "duration" INTEGER,
  ADD COLUMN "category" TEXT NOT NULL DEFAULT 'special',
  ADD COLUMN "displayOrder" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "note" TEXT,
  ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Ensure updatedAt reflects changes automatically
CREATE OR REPLACE FUNCTION set_option_price_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS option_price_updated_at ON "OptionPrice";
CREATE TRIGGER option_price_updated_at
BEFORE UPDATE ON "OptionPrice"
FOR EACH ROW
EXECUTE FUNCTION set_option_price_updated_at();
