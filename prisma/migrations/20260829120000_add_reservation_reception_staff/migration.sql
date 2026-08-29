-- Persist the administrator who accepted each reservation.
ALTER TABLE "Reservation"
ADD COLUMN "receptionStaffId" TEXT;

CREATE INDEX "Reservation_receptionStaffId_idx"
ON "Reservation"("receptionStaffId");

ALTER TABLE "Reservation"
ADD CONSTRAINT "Reservation_receptionStaffId_fkey"
FOREIGN KEY ("receptionStaffId") REFERENCES "Admin"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
