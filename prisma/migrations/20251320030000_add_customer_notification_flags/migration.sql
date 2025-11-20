ALTER TABLE "Customer"
ADD COLUMN "smsEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "emailNotificationEnabled" BOOLEAN NOT NULL DEFAULT true;
