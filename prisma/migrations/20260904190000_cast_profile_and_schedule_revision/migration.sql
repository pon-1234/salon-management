-- Notion tasks #282 and #283: cast onboarding, separate take-home tiers, and schedule media copy.
ALTER TYPE "DesignationFeeKind" ADD VALUE IF NOT EXISTS 'recommend';

ALTER TABLE "Cast"
  ADD COLUMN "phone" TEXT,
  ADD COLUMN "birthDate" TIMESTAMP(3),
  ADD COLUMN "blogWidget" TEXT,
  ADD COLUMN "snsAccount" TEXT,
  ADD COLUMN "joinedAt" TIMESTAMP(3),
  ADD COLUMN "retiredAt" TIMESTAMP(3),
  ADD COLUMN "interviewer" TEXT,
  ADD COLUMN "recruitmentMedia" TEXT,
  ADD COLUMN "photoIdVerifiedAt" TIMESTAMP(3),
  ADD COLUMN "residenceCertificateVerifiedAt" TIMESTAMP(3),
  ADD COLUMN "freeTakeHomeBonusId" TEXT,
  ADD COLUMN "recommendedTakeHomeBonusId" TEXT;

ALTER TABLE "CastSchedule" ADD COLUMN "mediaText" TEXT;

ALTER TABLE "Cast" ALTER COLUMN "employmentStatus" SET DEFAULT 'active';

CREATE INDEX "Cast_freeTakeHomeBonusId_idx" ON "Cast"("freeTakeHomeBonusId");
CREATE INDEX "Cast_recommendedTakeHomeBonusId_idx" ON "Cast"("recommendedTakeHomeBonusId");

ALTER TABLE "Cast"
  ADD CONSTRAINT "Cast_freeTakeHomeBonusId_fkey"
  FOREIGN KEY ("freeTakeHomeBonusId") REFERENCES "DesignationFee"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "Cast_recommendedTakeHomeBonusId_fkey"
  FOREIGN KEY ("recommendedTakeHomeBonusId") REFERENCES "DesignationFee"("id") ON DELETE SET NULL ON UPDATE CASCADE;
