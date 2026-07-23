/**
 * @design_doc   docs/LEGACY_DATA_MIGRATION_RUNBOOK.md offline file workflow
 * @related_to   lib/migration/legacy/file-runner.ts contains the tested orchestration
 * @known_issues This command never persists to PostgreSQL; staging persistence is a separate gate
 */
import {
  createLegacyMigrationDryRunFileIo,
  executeLegacyMigrationFileDryRun,
} from '@/lib/migration/legacy/file-runner'

/** @no-test-required reason: Thin process adapter delegates all decisions to tested file-runner.ts. */
async function main(): Promise<void> {
  const cwd = process.cwd()
  const result = await executeLegacyMigrationFileDryRun(
    process.argv.slice(2),
    cwd,
    createLegacyMigrationDryRunFileIo(cwd)
  )

  const output = result.exitCode === 0 ? console.log : console.error
  output(result.message)
  process.exitCode = result.exitCode
}

void main().catch(() => {
  console.error('Legacy migration dry run failed.')
  process.exitCode = 1
})
