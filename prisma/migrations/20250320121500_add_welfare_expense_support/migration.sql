-- Add welfare expense columns and rates
ALTER TABLE "Reservation"
ADD COLUMN "welfareExpense" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "Cast"
ADD COLUMN "welfareExpenseRate" DECIMAL;

ALTER TABLE "StoreSettings"
ADD COLUMN "welfareExpenseRate" DECIMAL NOT NULL DEFAULT 10;
