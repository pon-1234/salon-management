BEGIN;

CREATE TYPE "DesignationFeeKind" AS ENUM ('free', 'repeat', 'panel', 'other');

ALTER TABLE "DesignationFee"
  ADD COLUMN IF NOT EXISTS "kind" "DesignationFeeKind" NOT NULL DEFAULT 'other';

UPDATE "DesignationFee"
SET "kind" = CASE
  WHEN "name" IN ('本指名', 'リピート指名', 'repeat-designation') THEN 'repeat'::"DesignationFeeKind"
  WHEN "name" IN ('フリー', 'フリー指名', 'free-designation') THEN 'free'::"DesignationFeeKind"
  WHEN "name" IN ('パネル指名', 'panel-designation') THEN 'panel'::"DesignationFeeKind"
  ELSE 'other'::"DesignationFeeKind"
END;

COMMIT;
