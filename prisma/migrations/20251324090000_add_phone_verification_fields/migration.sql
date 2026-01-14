ALTER TABLE "Customer"
ADD COLUMN "phoneVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "phoneVerifiedAt" TIMESTAMP(3),
ADD COLUMN "phoneVerificationCode" TEXT,
ADD COLUMN "phoneVerificationExpiry" TIMESTAMP(3),
ADD COLUMN "phoneVerificationAttempts" INTEGER NOT NULL DEFAULT 0;
