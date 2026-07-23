BEGIN;

-- @design_doc   docs/LEGACY_DATA_MIGRATION_RUNBOOK.md immutable preview-import provenance
-- @related_to   LegacyMigrationRun binds each sourceKey to its accepted snapshot and policy
-- @known_issues Existing pre-ledger preview imports must be discarded and recreated, not backfilled

LOCK TABLE "LegacyMigrationMapping" IN SHARE ROW EXCLUSIVE MODE;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM "LegacyMigrationMapping") THEN
        RAISE EXCEPTION 'Cannot add legacy migration provenance: pre-ledger mappings exist';
    END IF;
END
$$;

CREATE TABLE "LegacyMigrationRun" (
    "id" TEXT NOT NULL,
    "sourceKey" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "cutoffAt" TIMESTAMP(3) NOT NULL,
    "migrationManifestSha256" TEXT NOT NULL,
    "canonicalExportSha256" TEXT NOT NULL,
    "snapshotManifestSha256" TEXT NOT NULL,
    "extractorVersion" TEXT NOT NULL,
    "transformationPolicyVersion" TEXT NOT NULL,
    "canonicalDigest" TEXT NOT NULL,
    "migrationVersion" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LegacyMigrationRun_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "LegacyMigrationRun_migrationVersion_check"
        CHECK ("migrationVersion" = 1),
    CONSTRAINT "LegacyMigrationRun_migrationManifestSha256_check"
        CHECK ("migrationManifestSha256" ~ '^[0-9a-f]{64}$'),
    CONSTRAINT "LegacyMigrationRun_canonicalExportSha256_check"
        CHECK ("canonicalExportSha256" ~ '^[0-9a-f]{64}$'),
    CONSTRAINT "LegacyMigrationRun_snapshotManifestSha256_check"
        CHECK ("snapshotManifestSha256" ~ '^[0-9a-f]{64}$'),
    CONSTRAINT "LegacyMigrationRun_canonicalDigest_check"
        CHECK ("canonicalDigest" ~ '^[0-9a-f]{64}$'),
    CONSTRAINT "LegacyMigrationRun_extractorVersion_check"
        CHECK ("extractorVersion" ~ '^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$'),
    CONSTRAINT "LegacyMigrationRun_transformationPolicyVersion_check"
        CHECK ("transformationPolicyVersion" ~ '^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$')
);

CREATE UNIQUE INDEX "LegacyMigrationRun_sourceKey_key" ON "LegacyMigrationRun"("sourceKey");
CREATE INDEX "LegacyMigrationRun_targetId_idx" ON "LegacyMigrationRun"("targetId");

ALTER TABLE "LegacyMigrationMapping"
    ADD CONSTRAINT "LegacyMigrationMapping_sourceHash_check"
        CHECK ("sourceHash" ~ '^[0-9a-f]{64}$'),
    ADD CONSTRAINT "LegacyMigrationMapping_migrationVersion_check"
        CHECK ("migrationVersion" = 1),
    ADD CONSTRAINT "LegacyMigrationMapping_sourceKey_fkey"
        FOREIGN KEY ("sourceKey") REFERENCES "LegacyMigrationRun"("sourceKey")
        ON DELETE RESTRICT ON UPDATE RESTRICT;

CREATE FUNCTION "reject_legacy_migration_provenance_mutation"()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Accepted legacy migration provenance is immutable';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "LegacyMigrationRun_immutable"
BEFORE UPDATE OR DELETE ON "LegacyMigrationRun"
FOR EACH ROW EXECUTE FUNCTION "reject_legacy_migration_provenance_mutation"();

CREATE TRIGGER "LegacyMigrationMapping_immutable"
BEFORE UPDATE OR DELETE ON "LegacyMigrationMapping"
FOR EACH ROW EXECUTE FUNCTION "reject_legacy_migration_provenance_mutation"();

COMMIT;
