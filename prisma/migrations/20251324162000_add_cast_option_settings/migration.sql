CREATE TABLE "CastOptionSetting" (
  "id" TEXT NOT NULL,
  "castId" TEXT NOT NULL,
  "optionId" TEXT NOT NULL,
  "visibility" TEXT NOT NULL DEFAULT 'public',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "CastOptionSetting_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CastOptionSetting_castId_optionId_key" ON "CastOptionSetting"("castId", "optionId");
CREATE INDEX "CastOptionSetting_castId_idx" ON "CastOptionSetting"("castId");
CREATE INDEX "CastOptionSetting_optionId_idx" ON "CastOptionSetting"("optionId");

ALTER TABLE "CastOptionSetting" ADD CONSTRAINT "CastOptionSetting_castId_fkey" FOREIGN KEY ("castId") REFERENCES "Cast"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CastOptionSetting" ADD CONSTRAINT "CastOptionSetting_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "OptionPrice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
