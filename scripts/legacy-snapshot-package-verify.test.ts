/**
 * @design_doc   docs/LEGACY_DATA_MIGRATION_RUNBOOK.md offline snapshot-package verification CLI
 * @related_to   legacy-snapshot-package-verify.ts exposes the tested read-only command boundary
 * @known_issues Tests use generated fixtures only and never access legacy production resources
 */
import { createHash } from 'node:crypto'
import { execFile } from 'node:child_process'
import { chmod, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

const executeFile = promisify(execFile)

describe('legacy snapshot package verification CLI', () => {
  let temporaryParent = ''
  let packageRoot = ''
  let policyPath = ''

  beforeEach(async () => {
    temporaryParent = await mkdtemp(join(tmpdir(), 'salon-snapshot-cli-test-'))
    packageRoot = join(temporaryParent, 'package')
    policyPath = join(temporaryParent, 'approved-policy.json')
    await mkdir(packageRoot, { mode: 0o700 })
    await mkdir(join(packageRoot, 'tables'), { mode: 0o700 })
    await mkdir(join(packageRoot, 'inventory'), { mode: 0o700 })
    await mkdir(join(packageRoot, 'canonical'), { mode: 0o700 })
    await Promise.all([
      chmod(packageRoot, 0o700),
      chmod(join(packageRoot, 'tables'), 0o700),
      chmod(join(packageRoot, 'inventory'), 0o700),
      chmod(join(packageRoot, 'canonical'), 0o700),
    ])

    const tableContents = '{"id":1}\n{"id":2}\n'
    const canonicalExportContents = '{"sourceKey":"fixture-source","rows":{}}\n'
    const schemaContents = 'CREATE TABLE users (id integer);\n'
    const catalogContents = '{"courses":[]}\n'
    const tableHash = sha256(tableContents)
    const canonicalExportRawHash = sha256(canonicalExportContents)
    const schemaHash = sha256(schemaContents)
    const catalogHash = sha256(catalogContents)
    await writePrivateFile(join(packageRoot, 'tables/customers.ndjson'), tableContents)
    await writePrivateFile(
      join(packageRoot, 'canonical/canonical-export.json'),
      canonicalExportContents
    )
    await writePrivateFile(join(packageRoot, 'inventory/database.schema.sql'), schemaContents)
    await writePrivateFile(join(packageRoot, 'inventory/course-catalog.json'), catalogContents)
    await writePrivateFile(
      join(packageRoot, 'snapshot-package.manifest.json'),
      JSON.stringify({
        version: 1,
        sourceKey: 'fixture-source',
        timezone: 'Asia/Tokyo',
        capturedAt: '2026-07-20T09:00:00+09:00',
        cutoffAt: '2026-07-20T09:01:00+09:00',
        authoritativeOrigin: 'fixture-origin',
        extractorVersion: '1.0.0',
        consistency: 'transaction-snapshot',
        canonicalExportInventory: {
          path: 'canonical/canonical-export.json',
          sha256: canonicalExportRawHash,
        },
        tables: [
          {
            origin: 'customers',
            physicalTable: 'users',
            usage: 'canonical-source',
            path: 'tables/customers.ndjson',
            rowCount: 2,
            sha256: tableHash,
          },
        ],
        schemaOnlySqlInventory: {
          path: 'inventory/database.schema.sql',
          sha256: schemaHash,
        },
        staticCatalogInventory: {
          path: 'inventory/course-catalog.json',
          sha256: catalogHash,
        },
      })
    )
    await writePrivateFile(
      policyPath,
      JSON.stringify({
        version: 1,
        expectedSourceKey: 'fixture-source',
        expectedAuthoritativeOrigin: 'fixture-origin',
        expectedExtractorVersion: '1.0.0',
        expectedTransformationPolicyVersion: 'legacy-preview-policy-v1',
        requiredTables: [
          { origin: 'customers', physicalTable: 'users', usage: 'canonical-source' },
        ],
        expectedSchemaOnlySqlSha256: schemaHash,
        expectedStaticCatalogSha256: catalogHash,
      })
    )
  })

  afterEach(async () => {
    if (temporaryParent) await rm(temporaryParent, { recursive: true, force: true })
  })

  it('prints exactly one redacted aggregate JSON report and exits zero on success', async () => {
    const execution = await runCli()

    expect(execution.stderr).toBe('')
    expect(execution.stdout.trim().split('\n')).toHaveLength(1)
    const report = JSON.parse(execution.stdout) as Record<string, unknown>
    expect(report).toEqual(
      expect.objectContaining({
        success: true,
        evidenceScope: 'artifact-integrity-only',
        checksumStatus: 'verified',
        verifiedFileCount: 4,
        verifiedTableCount: 1,
        verifiedRowCount: 2,
      })
    )
    expect(execution.stdout).not.toContain(packageRoot)
    expect(execution.stdout).not.toContain('customers.ndjson')
    expect(execution.stdout).not.toContain('fixture-source')
    expect(execution.stdout).not.toContain('users')
  })

  it('prints only a redacted report and exits one for a verification failure', async () => {
    await writeFile(join(packageRoot, 'tables/customers.ndjson'), '{"id":999}\n')

    const failure = await captureCliFailure()

    expect(failure.code).toBe(1)
    expect(failure.stderr).toBe('')
    const report = JSON.parse(failure.stdout) as Record<string, unknown>
    expect(report).toEqual(
      expect.objectContaining({
        success: false,
        evidenceScope: 'none',
        checksumStatus: 'failed',
        verifiedFileCount: 0,
        verifiedTableCount: 0,
        verifiedRowCount: 0,
        verifiedByteCount: 0,
      })
    )
    expect(failure.stdout).not.toContain(packageRoot)
    expect(failure.stdout).not.toContain('customers.ndjson')
    expect(failure.stdout).not.toContain('fixture-source')
  })

  async function runCli(): Promise<{ stdout: string; stderr: string }> {
    return executeFile(
      join(process.cwd(), 'node_modules/.bin/tsx'),
      [
        'scripts/legacy-snapshot-package-verify.ts',
        '--package-root',
        packageRoot,
        '--manifest',
        'snapshot-package.manifest.json',
        '--policy',
        policyPath,
      ],
      { cwd: process.cwd() }
    )
  }

  async function captureCliFailure(): Promise<{ code: number; stdout: string; stderr: string }> {
    try {
      await runCli()
    } catch (error) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        'stdout' in error &&
        'stderr' in error &&
        typeof error.code === 'number' &&
        typeof error.stdout === 'string' &&
        typeof error.stderr === 'string'
      ) {
        return { code: error.code, stdout: error.stdout, stderr: error.stderr }
      }
    }
    throw new Error('Expected CLI to exit with a failure code.')
  }
})

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex')
}

async function writePrivateFile(path: string, contents: string): Promise<void> {
  await writeFile(path, contents, { mode: 0o600 })
  await chmod(path, 0o600)
}
