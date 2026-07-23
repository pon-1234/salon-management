/**
 * @design_doc   docs/LEGACY_DATA_MIGRATION_RUNBOOK.md idempotent import contract
 * @related_to   LegacyMigrationMapping tracks legacy-to-target IDs and source hashes
 * @known_issues Persistence is enabled only after a zero-error staging dry run
 */
CREATE TABLE "LegacyMigrationMapping" (
    "id" TEXT NOT NULL,
    "sourceKey" TEXT NOT NULL,
    "legacyEntity" TEXT NOT NULL,
    "legacyId" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "sourceHash" TEXT NOT NULL,
    "migrationVersion" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LegacyMigrationMapping_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LegacyMigrationMapping_sourceKey_legacyEntity_legacyId_key"
ON "LegacyMigrationMapping"("sourceKey", "legacyEntity", "legacyId");

CREATE INDEX "LegacyMigrationMapping_legacyEntity_targetId_idx"
ON "LegacyMigrationMapping"("legacyEntity", "targetId");
