/**
 * @design_doc   docs/LEGACY_DATA_MIGRATION_RUNBOOK.md guarded disposable preview import CLI
 * @related_to   lib/migration/legacy/preview-import-runner.ts owns every safety decision
 * @known_issues Raw snapshot extraction remains separate and this command accepts no DB or SSH flags
 */
import {
  createLegacyPreviewImportRejectedExecution,
  executeLegacyPreviewImport,
  serializeLegacyPreviewImportReport,
} from '@/lib/migration/legacy/preview-import-runner'

async function main(): Promise<void> {
  const execution = await executeLegacyPreviewImport(process.argv.slice(2))
  process.stdout.write(serializeLegacyPreviewImportReport(execution.report))
  process.exitCode = execution.exitCode
}

void main().catch(() => {
  const execution = createLegacyPreviewImportRejectedExecution()
  process.stdout.write(serializeLegacyPreviewImportReport(execution.report))
  process.exitCode = execution.exitCode
})
