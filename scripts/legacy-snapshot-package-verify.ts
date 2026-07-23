/**
 * @design_doc   docs/LEGACY_DATA_MIGRATION_RUNBOOK.md offline snapshot-package verification CLI
 * @related_to   lib/migration/legacy/snapshot-package-runner.ts owns all tested command decisions
 * @known_issues This command verifies files only and deliberately accepts no database or SSH inputs
 */
import {
  executeLegacySnapshotPackageVerification,
  serializeLegacySnapshotPackageVerificationReport,
} from '@/lib/migration/legacy/snapshot-package-runner'

async function main(): Promise<void> {
  const execution = await executeLegacySnapshotPackageVerification(process.argv.slice(2))
  process.stdout.write(serializeLegacySnapshotPackageVerificationReport(execution.report))
  process.exitCode = execution.exitCode
}

void main().catch(() => {
  process.stdout.write(
    '{"success":false,"evidenceScope":"none","checksumStatus":"not-checked","verifiedFileCount":0,"verifiedTableCount":0,"verifiedRowCount":0,"verifiedByteCount":0,"issues":[{"code":"MANIFEST_REJECTED","message":"Snapshot verification inputs were rejected."}]}\n'
  )
  process.exitCode = 1
})
