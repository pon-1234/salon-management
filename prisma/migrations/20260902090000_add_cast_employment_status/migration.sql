BEGIN;

ALTER TABLE "Cast"
ADD COLUMN "employmentStatus" TEXT NOT NULL DEFAULT 'provisional';

ALTER TABLE "Cast"
ADD COLUMN "specialDesignationFeeId" TEXT;

ALTER TABLE "CastSchedule"
ADD COLUMN "notes" TEXT;

UPDATE "Cast" AS cast_record
SET "specialDesignationFeeId" = (
  SELECT fee."id"
  FROM "DesignationFee" AS fee
  WHERE fee."storeId" = cast_record."storeId"
    AND fee."price" = cast_record."specialDesignationFee"
    AND fee."kind" <> 'repeat'
  ORDER BY fee."sortOrder" ASC, fee."id" ASC
  LIMIT 1
)
WHERE cast_record."specialDesignationFee" IS NOT NULL
  AND cast_record."specialDesignationFee" > 0;

CREATE INDEX "Cast_specialDesignationFeeId_idx"
ON "Cast"("specialDesignationFeeId");

ALTER TABLE "Cast"
ADD CONSTRAINT "Cast_specialDesignationFeeId_fkey"
FOREIGN KEY ("specialDesignationFeeId") REFERENCES "DesignationFee"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

UPDATE "Cast"
SET "employmentStatus" = 'active';

ALTER TABLE "Cast"
ADD CONSTRAINT "Cast_employmentStatus_check"
CHECK ("employmentStatus" IN ('provisional', 'active', 'retired'));

UPDATE "OptionPrice"
SET "isActive" = false,
    "archivedAt" = COALESCE("archivedAt", CURRENT_TIMESTAMP)
WHERE "name" IN ('亀頭デンマ', '密着顔面騎乗');

COMMIT;
