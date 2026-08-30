-- Store the ordered, server-validated course selections used for a reservation.
ALTER TABLE "Reservation" ADD COLUMN "courseItems" JSONB;
