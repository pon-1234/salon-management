-- Add login credentials to cast
ALTER TABLE "Cast"
ADD COLUMN "loginEmail" TEXT,
ADD COLUMN "passwordHash" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "Cast_loginEmail_key" ON "Cast" ("loginEmail") WHERE "loginEmail" IS NOT NULL;

-- Add cast attendance timestamps to reservations
ALTER TABLE "Reservation"
ADD COLUMN "castCheckedInAt" TIMESTAMP(3),
ADD COLUMN "castCheckedOutAt" TIMESTAMP(3);

-- Reservation attendance requests table
CREATE TABLE "ReservationAttendanceRequest" (
    "id" TEXT NOT NULL,
    "reservationId" TEXT NOT NULL,
    "castId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "requestedTime" TIMESTAMP(3) NOT NULL,
    "reason" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "handledByAdmin" TEXT,
    "handledAt" TIMESTAMP(3),
    "responseNote" TEXT,
    CONSTRAINT "ReservationAttendanceRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ReservationAttendanceRequest_reservationId_idx" ON "ReservationAttendanceRequest" ("reservationId");
CREATE INDEX "ReservationAttendanceRequest_castId_idx" ON "ReservationAttendanceRequest" ("castId");

ALTER TABLE "ReservationAttendanceRequest"
ADD CONSTRAINT "ReservationAttendanceRequest_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "Reservation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ReservationAttendanceRequest"
ADD CONSTRAINT "ReservationAttendanceRequest_castId_fkey" FOREIGN KEY ("castId") REFERENCES "Cast"("id") ON DELETE CASCADE ON UPDATE CASCADE;
