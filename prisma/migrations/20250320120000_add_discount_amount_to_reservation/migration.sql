-- Add discountAmount column to reservations for tracking manual discounts
ALTER TABLE "Reservation"
ADD COLUMN "discountAmount" INTEGER NOT NULL DEFAULT 0;
