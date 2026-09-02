BEGIN;

ALTER TABLE "Cast"
ADD COLUMN "panelTakeHomeBonusId" TEXT,
ADD COLUMN "regularTakeHomeBonusId" TEXT;

CREATE INDEX "Cast_panelTakeHomeBonusId_idx"
ON "Cast"("panelTakeHomeBonusId");

CREATE INDEX "Cast_regularTakeHomeBonusId_idx"
ON "Cast"("regularTakeHomeBonusId");

ALTER TABLE "Cast"
ADD CONSTRAINT "Cast_panelTakeHomeBonusId_fkey"
FOREIGN KEY ("panelTakeHomeBonusId") REFERENCES "DesignationFee"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Cast"
ADD CONSTRAINT "Cast_regularTakeHomeBonusId_fkey"
FOREIGN KEY ("regularTakeHomeBonusId") REFERENCES "DesignationFee"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

COMMIT;
