-- ReservationLineLog tracks manual LINE notifications per reservation
CREATE TABLE "ReservationLineLog" (
    "id" TEXT NOT NULL,
    "reservationId" TEXT NOT NULL,
    "castId" TEXT,
    "message" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'sent',
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ReservationLineLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ReservationLineLog_reservationId_idx" ON "ReservationLineLog"("reservationId");
CREATE INDEX "ReservationLineLog_castId_idx" ON "ReservationLineLog"("castId");

ALTER TABLE "ReservationLineLog"
ADD CONSTRAINT "ReservationLineLog_reservationId_fkey"
FOREIGN KEY ("reservationId") REFERENCES "Reservation"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ReservationLineLog"
ADD CONSTRAINT "ReservationLineLog_castId_fkey"
FOREIGN KEY ("castId") REFERENCES "Cast"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
