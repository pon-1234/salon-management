ALTER TABLE "Reservation"
ADD COLUMN "entryMemo" TEXT,
ADD COLUMN "entryReceivedAt" TIMESTAMP(3),
ADD COLUMN "entryReceivedBy" TEXT,
ADD COLUMN "entryNotifiedAt" TIMESTAMP(3),
ADD COLUMN "entryConfirmedAt" TIMESTAMP(3),
ADD COLUMN "entryReminderSentAt" TIMESTAMP(3);
