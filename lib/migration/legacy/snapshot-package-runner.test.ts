/**
 * @design_doc   docs/LEGACY_DATA_MIGRATION_RUNBOOK.md offline snapshot-package verification CLI
 * @related_to   snapshot-package-fs.ts provides guarded reads; snapshot-package.ts verifies content
 * @known_issues This runner verifies packages only and deliberately has no database or SSH capability
 */
import { describe, expect, it, vi } from 'vitest'
import type { LegacySnapshotPackageFilesystem } from './snapshot-package-fs'
import {
  executeLegacySnapshotPackageVerification,
  parseLegacySnapshotPackageVerificationArgs,
  serializeLegacySnapshotPackageVerificationReport,
  type LegacySnapshotPackageRunnerDependencies,
} from './snapshot-package-runner'

const tableHash = 'a'.repeat(64)
const schemaHash = 'b'.repeat(64)
const catalogHash = 'c'.repeat(64)
const canonicalExportRawHash = 'd'.repeat(64)

const manifest = {
  version: 1,
  sourceKey: 'gambit-front-production',
  timezone: 'Asia/Tokyo',
  capturedAt: '2026-07-20T09:00:00+09:00',
  cutoffAt: '2026-07-20T09:01:00+09:00',
  authoritativeOrigin: 'gambit-front-prod-01',
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
      minPrimaryKey: 'private-customer-1',
      maxPrimaryKey: 'private-customer-2',
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
}

const policyFile = {
  version: 1,
  expectedSourceKey: 'gambit-front-production',
  expectedAuthoritativeOrigin: 'gambit-front-prod-01',
  expectedExtractorVersion: '1.0.0',
  expectedTransformationPolicyVersion: 'legacy-preview-policy-v1',
  requiredTables: [{ origin: 'customers', physicalTable: 'users', usage: 'canonical-source' }],
  expectedSchemaOnlySqlSha256: schemaHash,
  expectedStaticCatalogSha256: catalogHash,
}

const validArgv = [
  '--package-root',
  '/isolated/legacy-snapshot',
  '--manifest',
  'snapshot-package.manifest.json',
  '--policy',
  '/approved/snapshot-policy.json',
]
const invalidArgumentCases: string[][] = [
  [],
  [...validArgv, '--database-url', 'postgresql://secret@production/live'],
  [...validArgv, '--ssh-host', 'production.example.test'],
  [...validArgv, '--package-root', '/another/root'],
  ['--package-root', '/', '--manifest', 'manifest.json', '--policy', '/approved/policy.json'],
  [
    '--package-root',
    'relative',
    '--manifest',
    'manifest.json',
    '--policy',
    '/approved/policy.json',
  ],
  [
    '--package-root',
    '/isolated/package',
    '--manifest',
    '../manifest.json',
    '--policy',
    '/approved/policy.json',
  ],
  [
    '--package-root',
    '/isolated/package',
    '--manifest',
    'manifest.json',
    '--policy',
    'relative-policy.json',
  ],
]

describe('parseLegacySnapshotPackageVerificationArgs', () => {
  it('accepts only the explicit read-only package inputs', () => {
    expect(parseLegacySnapshotPackageVerificationArgs(validArgv)).toEqual({
      packageRoot: '/isolated/legacy-snapshot',
      manifestPath: 'snapshot-package.manifest.json',
      policyPath: '/approved/snapshot-policy.json',
    })
  })

  it.each(invalidArgumentCases.map((argv) => [argv] as const))(
    'rejects missing, dangerous, unknown, or duplicate arguments without echoing them',
    (argv) => {
      expect(() => parseLegacySnapshotPackageVerificationArgs(argv)).toThrow(
        'Snapshot verification arguments were rejected.'
      )
    }
  )
})

describe('executeLegacySnapshotPackageVerification', () => {
  function createDependencies(
    inspectionOverride: Record<string, unknown> = {}
  ): LegacySnapshotPackageRunnerDependencies {
    const filesystem: LegacySnapshotPackageFilesystem = {
      readTextFile: vi.fn().mockResolvedValue(JSON.stringify(manifest)),
      inspectFile: vi.fn(async (path, kind) => ({
        isFile: true,
        isSymbolicLink: false,
        sizeBytes: kind === 'table' ? 100 : 20,
        sha256:
          path === manifest.tables[0].path
            ? tableHash
            : path === manifest.canonicalExportInventory.path
              ? canonicalExportRawHash
              : path === manifest.schemaOnlySqlInventory.path
                ? schemaHash
                : catalogHash,
        ...(kind === 'table' ? { rowCount: 2 } : {}),
        ...inspectionOverride,
      })),
    }
    return {
      createFilesystem: vi.fn().mockResolvedValue(filesystem),
      readPolicyText: vi.fn().mockResolvedValue(JSON.stringify(policyFile)),
    }
  }

  it('verifies a strict package and returns a success-only aggregate report', async () => {
    const dependencies = createDependencies()

    const execution = await executeLegacySnapshotPackageVerification(validArgv, dependencies)

    expect(execution.exitCode).toBe(0)
    expect(execution.report).toEqual(
      expect.objectContaining({
        success: true,
        evidenceScope: 'artifact-integrity-only',
        checksumStatus: 'verified',
        verifiedFileCount: 4,
        verifiedTableCount: 1,
        verifiedRowCount: 2,
        verifiedByteCount: 160,
        manifestSha256: expect.stringMatching(/^[a-f0-9]{64}$/u),
        issues: [],
      })
    )
    const output = serializeLegacySnapshotPackageVerificationReport(execution.report)
    expect(output.endsWith('\n')).toBe(true)
    expect(output).not.toContain('customers.ndjson')
    expect(output).not.toContain('gambit-front')
    expect(output).not.toContain('users')
    expect(output).not.toContain('private-customer')
  })

  it('returns exit 1 and a redacted aggregate when artifact inspection fails', async () => {
    const dependencies = createDependencies()
    const filesystem = await dependencies.createFilesystem('/unused')
    vi.mocked(filesystem.inspectFile).mockRejectedValueOnce(
      new Error('/private/production/password-export.ndjson could not be opened')
    )
    vi.mocked(dependencies.createFilesystem).mockResolvedValue(filesystem)

    const execution = await executeLegacySnapshotPackageVerification(validArgv, dependencies)
    const output = serializeLegacySnapshotPackageVerificationReport(execution.report)

    expect(execution.exitCode).toBe(1)
    expect(execution.report).toEqual(
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
    expect(output).not.toContain('/private/production')
    expect(output).not.toContain('password-export')
    expect(output).not.toContain('customers.ndjson')
  })

  const filesystemFailures: Array<
    [string, { createFilesystemRejects?: boolean; policyReadRejects?: boolean }]
  > = [
    ['manifest read', { createFilesystemRejects: true }],
    ['policy read', { policyReadRejects: true }],
  ]

  it.each(filesystemFailures)(
    'redacts %s filesystem errors before returning exit 1',
    async (_, failure) => {
      const dependencies = createDependencies()
      if (failure.createFilesystemRejects) {
        vi.mocked(dependencies.createFilesystem).mockRejectedValue(
          new Error('/secret/package/root missing')
        )
      }
      if (failure.policyReadRejects) {
        vi.mocked(dependencies.readPolicyText).mockRejectedValue(
          new Error('/secret/policy/password.json missing')
        )
      }

      const execution = await executeLegacySnapshotPackageVerification(validArgv, dependencies)
      const output = serializeLegacySnapshotPackageVerificationReport(execution.report)

      expect(execution.exitCode).toBe(1)
      expect(execution.report.checksumStatus).toBe('not-checked')
      expect(output).not.toContain('/secret')
      expect(output).not.toContain('password.json')
    }
  )

  it.each([
    ['malformed manifest', '{'],
    ['duplicate manifest key', '{"version":1,"version":1}'],
  ])('rejects %s JSON before inspecting artifacts', async (_, manifestText) => {
    const dependencies = createDependencies()
    const filesystem = await dependencies.createFilesystem('/unused')
    vi.mocked(filesystem.readTextFile).mockResolvedValue(manifestText)
    vi.mocked(dependencies.createFilesystem).mockResolvedValue(filesystem)

    const execution = await executeLegacySnapshotPackageVerification(validArgv, dependencies)

    expect(execution.exitCode).toBe(1)
    expect(execution.report.checksumStatus).toBe('not-checked')
    expect(filesystem.inspectFile).not.toHaveBeenCalled()
  })

  it.each([
    ['malformed policy', '{'],
    ['duplicate policy key', '{"version":1,"version":1}'],
    ['unsupported policy version', JSON.stringify({ ...policyFile, version: 2 })],
    ['unknown policy field', JSON.stringify({ ...policyFile, databaseHost: 'private-db' })],
    [
      'unknown table policy field',
      JSON.stringify({
        ...policyFile,
        requiredTables: [{ ...policyFile.requiredTables[0], passwordColumn: 'password' }],
      }),
    ],
  ])('rejects %s before inspecting artifacts', async (_, policyText) => {
    const dependencies = createDependencies()
    const filesystem = await dependencies.createFilesystem('/unused')
    vi.mocked(dependencies.createFilesystem).mockResolvedValue(filesystem)
    vi.mocked(dependencies.readPolicyText).mockResolvedValue(policyText)

    const execution = await executeLegacySnapshotPackageVerification(validArgv, dependencies)
    const output = serializeLegacySnapshotPackageVerificationReport(execution.report)

    expect(execution.exitCode).toBe(1)
    expect(execution.report.checksumStatus).toBe('not-checked')
    expect(filesystem.inspectFile).not.toHaveBeenCalled()
    expect(output).not.toContain('private-db')
    expect(output).not.toContain('passwordColumn')
  })

  it('does not invoke any dependency for rejected CLI arguments', async () => {
    const dependencies = createDependencies()

    const execution = await executeLegacySnapshotPackageVerification(
      [...validArgv, '--ssh-key', '/secret/id_ed25519'],
      dependencies
    )

    expect(execution.exitCode).toBe(1)
    expect(dependencies.createFilesystem).not.toHaveBeenCalled()
    expect(dependencies.readPolicyText).not.toHaveBeenCalled()
    expect(serializeLegacySnapshotPackageVerificationReport(execution.report)).not.toContain(
      'id_ed25519'
    )
  })
})
