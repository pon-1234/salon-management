ALTER TABLE "Customer"
ADD COLUMN "accountStatus" TEXT NOT NULL DEFAULT 'active',
ADD COLUMN "membershipStage" TEXT NOT NULL DEFAULT 'regular',
ADD COLUMN "lastLoginAt" TIMESTAMP(3),
ADD COLUMN "lastVisitAt" TIMESTAMP(3);

CREATE INDEX "Customer_accountStatus_idx" ON "Customer"("accountStatus");
