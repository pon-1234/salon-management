/**
 * @design_doc   docs/LEGACY_DATA_MIGRATION_RUNBOOK.md offline snapshot-package intake gate
 * @related_to   snapshot-package.ts validates and verifies immutable legacy export packages
 * @known_issues Version 1 verifies metadata and NDJSON row counts but does not import records
 */
import { createHash } from 'node:crypto'
import { describe, expect, it, vi } from 'vitest'
import {
  deriveLegacyApprovedSourceTables,
  validateLegacySnapshotPackageManifest,
  verifyLegacySnapshotPackage,
  type LegacySnapshotPackageIo,
  type LegacySnapshotPackageManifestV1,
  type LegacySnapshotPackagePolicy,
} from './snapshot-package'

const tableHash = 'a'.repeat(64)
const schemaHash = 'b'.repeat(64)
const catalogHash = 'c'.repeat(64)
const imageHash = 'd'.repeat(64)
const canonicalExportRawHash = 'e'.repeat(64)

const policy: LegacySnapshotPackagePolicy = {
  expectedSourceKey: 'gambit-front-production',
  expectedAuthoritativeOrigin: 'gambit-front-prod-01',
  expectedExtractorVersion: '1.0.0',
  expectedTransformationPolicyVersion: 'legacy-preview-policy-v1',
  requiredTables: [{ origin: 'customers', physicalTable: 'users', usage: 'canonical-source' }],
  expectedSchemaOnlySqlSha256: schemaHash,
  expectedStaticCatalogSha256: catalogHash,
}

const validManifest: LegacySnapshotPackageManifestV1 = {
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
      path: 'tables/customers.ndjson.gz',
      rowCount: 2,
      minPrimaryKey: 'customer-0001',
      maxPrimaryKey: 'customer-0002',
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
  publicImageManifest: {
    path: 'inventory/public-images.json',
    sha256: imageHash,
  },
}
const manifestSha256 = createHash('sha256')
  .update('salon-management:legacy-snapshot-package-manifest:v1\0', 'utf8')
  .update(stableJson(validManifest), 'utf8')
  .digest('hex')

describe('validateLegacySnapshotPackageManifest', () => {
  it('derives sorted origin-qualified canonical source tables without ambiguity', () => {
    expect(deriveLegacyApprovedSourceTables(validManifest)).toEqual(['customers.users'])
  })

  it('rejects a table inventory without an explicit canonical or reconciliation usage', () => {
    const tableWithoutUsage = { ...validManifest.tables[0] } as Record<string, unknown>
    delete tableWithoutUsage.usage

    expect(
      validateLegacySnapshotPackageManifest(
        { ...validManifest, tables: [tableWithoutUsage] },
        policy
      ).success
    ).toBe(false)
  })

  it('excludes nonempty reconciliation-only tables from canonical row provenance', () => {
    const manifestWithReconciliationTable: LegacySnapshotPackageManifestV1 = {
      ...validManifest,
      tables: [
        ...validManifest.tables,
        {
          ...validManifest.tables[0],
          origin: 'customers_replica',
          physicalTable: 'users',
          usage: 'reconciliation-only',
          path: 'tables/customers-replica.ndjson.gz',
        },
      ],
    }

    expect(deriveLegacyApprovedSourceTables(manifestWithReconciliationTable)).toEqual([
      'customers.users',
    ])
  })

  it('rejects a package that omits a table required by the approved policy', () => {
    const policyWithMissingTable = {
      ...policy,
      requiredTables: [
        { origin: 'customers', physicalTable: 'users', usage: 'canonical-source' },
        { origin: 'customers', physicalTable: 'users_2025', usage: 'canonical-source' },
      ],
    } as unknown as LegacySnapshotPackagePolicy

    expect(
      validateLegacySnapshotPackageManifest(validManifest, policyWithMissingTable).success
    ).toBe(false)
  })

  it('rejects canonical-versus-reconciliation usage drift from the approved policy', () => {
    const usagePinnedPolicy = {
      ...policy,
      requiredTables: [
        { origin: 'customers', physicalTable: 'users', usage: 'reconciliation-only' },
      ],
    } as unknown as LegacySnapshotPackagePolicy

    expect(validateLegacySnapshotPackageManifest(validManifest, usagePinnedPolicy).success).toBe(
      false
    )
  })

  it('rejects multiple logical origins that cannot be proven by one v1 transaction snapshot', () => {
    const secondTable = {
      ...validManifest.tables[0],
      origin: 'shop_gold',
      physicalTable: 'shops',
      path: 'tables/shop-gold-shops.ndjson.gz',
    }
    const multiOriginPolicy: LegacySnapshotPackagePolicy = {
      ...policy,
      requiredTables: [
        ...policy.requiredTables,
        { origin: 'shop_gold', physicalTable: 'shops', usage: 'canonical-source' },
      ],
    }

    const result = validateLegacySnapshotPackageManifest(
      { ...validManifest, tables: [...validManifest.tables, secondTable] },
      multiOriginPolicy
    )

    expect(result.success).toBe(false)
    if (result.success) throw new Error('Expected multi-origin rejection')
    expect(result.issues.map((issue) => issue.code)).toContain('INVALID_CONSISTENCY')
  })

  it('rejects an extractor version not pinned by the approved snapshot policy', () => {
    const versionPinnedPolicy = {
      ...policy,
      expectedExtractorVersion: '2.0.0',
      expectedTransformationPolicyVersion: 'legacy-preview-policy-v1',
    } as unknown as LegacySnapshotPackagePolicy

    expect(validateLegacySnapshotPackageManifest(validManifest, versionPinnedPolicy).success).toBe(
      false
    )
  })

  it('keeps zero-row tables in package verification but excludes them from required row provenance', () => {
    const manifestWithEmptyYear = {
      ...validManifest,
      tables: [
        ...validManifest.tables,
        {
          ...validManifest.tables[0],
          origin: 'customers_archive',
          physicalTable: 'users_2024',
          path: 'tables/customers-2024.ndjson.gz',
          rowCount: 0,
        },
      ],
    }

    expect(deriveLegacyApprovedSourceTables(manifestWithEmptyYear)).toEqual(['customers.users'])
  })

  it.each(['shop-gold', 'ShopGold'])(
    'rejects a source origin alias that cannot be used in canonical provenance: %s',
    (origin) => {
      const input = {
        ...validManifest,
        tables: [{ ...validManifest.tables[0], origin }],
      }
      const matchingPolicy = {
        ...policy,
        requiredTables: [{ origin, physicalTable: 'users', usage: 'canonical-source' as const }],
      }

      expect(validateLegacySnapshotPackageManifest(input, matchingPolicy).success).toBe(false)
    }
  )

  it('accepts an exact version-1 transaction snapshot bound to the approved source and catalogs', () => {
    expect(validateLegacySnapshotPackageManifest(validManifest, policy)).toEqual({
      success: true,
      data: validManifest,
      manifestSha256,
      issues: [],
    })
  })

  it('requires a canonical export artifact that is cryptographically bound into the package manifest', () => {
    const manifestWithoutCanonicalExport = { ...validManifest } as Record<string, unknown>
    delete manifestWithoutCanonicalExport.canonicalExportInventory

    expect(
      validateLegacySnapshotPackageManifest(manifestWithoutCanonicalExport, policy).success
    ).toBe(false)
  })

  it('uses domain-separated stable JSON so object key order cannot change the manifest digest', () => {
    const reordered = {
      publicImageManifest: validManifest.publicImageManifest,
      staticCatalogInventory: validManifest.staticCatalogInventory,
      schemaOnlySqlInventory: validManifest.schemaOnlySqlInventory,
      tables: validManifest.tables,
      canonicalExportInventory: validManifest.canonicalExportInventory,
      consistency: validManifest.consistency,
      extractorVersion: validManifest.extractorVersion,
      authoritativeOrigin: validManifest.authoritativeOrigin,
      cutoffAt: validManifest.cutoffAt,
      capturedAt: validManifest.capturedAt,
      timezone: validManifest.timezone,
      sourceKey: validManifest.sourceKey,
      version: validManifest.version,
    }

    const result = validateLegacySnapshotPackageManifest(reordered, policy)

    expect(result.success).toBe(true)
    if (!result.success) throw new Error('Expected validation success')
    expect(result.manifestSha256).toBe(manifestSha256)
  })

  it.each([
    ['unsupported version', { version: 2 }],
    ['wrong timezone', { timezone: 'UTC' }],
    ['timezone-less capturedAt', { capturedAt: '2026-07-20T09:00:00' }],
    ['invalid cutoffAt', { cutoffAt: 'not-a-date' }],
    ['capture after cutoff', { capturedAt: '2026-07-20T09:02:00+09:00' }],
    ['wrong consistency', { consistency: 'best-effort' }],
    ['wrong source', { sourceKey: 'another-source' }],
    ['wrong origin', { authoritativeOrigin: 'another-origin' }],
    ['DSN origin', { authoritativeOrigin: 'mysql://user:password@db/live' }],
    ['URL source', { sourceKey: 'https://legacy.example.test' }],
    ['empty extractor version', { extractorVersion: '  ' }],
  ])('rejects %s', (_, override) => {
    expect(
      validateLegacySnapshotPackageManifest({ ...validManifest, ...override }, policy).success
    ).toBe(false)
  })

  it.each([
    ['top-level', { ...validManifest, databasePassword: 'do-not-leak' }],
    [
      'table',
      {
        ...validManifest,
        tables: [{ ...validManifest.tables[0], databaseHost: 'internal-db.example.test' }],
      },
    ],
    [
      'artifact',
      {
        ...validManifest,
        schemaOnlySqlInventory: {
          ...validManifest.schemaOnlySqlInventory,
          credentialFile: '.env.production',
        },
      },
    ],
  ])('rejects unknown or credential-like %s fields without echoing their values', (_, input) => {
    const result = validateLegacySnapshotPackageManifest(input, policy)

    expect(result.success).toBe(false)
    expect(JSON.stringify(result)).not.toContain('do-not-leak')
    expect(JSON.stringify(result)).not.toContain('internal-db.example.test')
    expect(JSON.stringify(result)).not.toContain('.env.production')
  })

  it('rejects an empty table inventory and duplicate physical identities', () => {
    expect(
      validateLegacySnapshotPackageManifest({ ...validManifest, tables: [] }, policy).success
    ).toBe(false)

    const duplicate = {
      ...validManifest,
      tables: [
        validManifest.tables[0],
        { ...validManifest.tables[0], path: 'tables/customers-copy.ndjson' },
      ],
    }
    expect(validateLegacySnapshotPackageManifest(duplicate, policy).success).toBe(false)
  })

  it('rejects paths reused anywhere in the package', () => {
    const result = validateLegacySnapshotPackageManifest(
      {
        ...validManifest,
        staticCatalogInventory: {
          ...validManifest.staticCatalogInventory,
          path: validManifest.schemaOnlySqlInventory.path,
        },
      },
      policy
    )

    expect(result.success).toBe(false)
  })

  it.each([
    ['absolute', '/tmp/customers.ndjson'],
    ['Windows absolute', 'C:/exports/customers.ndjson'],
    ['traversal', '../customers.ndjson'],
    ['nested traversal', 'tables/../customers.ndjson'],
    ['backslash', 'tables\\customers.ndjson'],
    ['credential-like', 'secrets/customers.ndjson'],
    ['config-like', 'config/database/customers.ndjson'],
    ['wrong extension', 'tables/customers.json'],
    ['uppercase extension', 'tables/customers.NDJSON'],
  ])('rejects an unsafe table path: %s', (_, path) => {
    const result = validateLegacySnapshotPackageManifest(
      { ...validManifest, tables: [{ ...validManifest.tables[0], path }] },
      policy
    )

    expect(result.success).toBe(false)
  })

  it.each([
    ['schema extension', 'inventory/schema.sql'],
    ['catalog extension', 'inventory/course-catalog.yaml'],
    ['NDJSON image manifest', 'inventory/public-images.ndjson'],
    ['image extension', 'inventory/public-images.csv'],
  ])('enforces role-specific artifact paths: %s', (kind, path) => {
    const override =
      kind === 'schema extension'
        ? { schemaOnlySqlInventory: { ...validManifest.schemaOnlySqlInventory, path } }
        : kind === 'catalog extension'
          ? { staticCatalogInventory: { ...validManifest.staticCatalogInventory, path } }
          : { publicImageManifest: { ...validManifest.publicImageManifest!, path } }

    expect(
      validateLegacySnapshotPackageManifest({ ...validManifest, ...override }, policy).success
    ).toBe(false)
  })

  it.each([
    ['unapproved origin/table pair', { origin: 'payments', physicalTable: 'transactions' }],
    ['quoted table', { physicalTable: '`users`' }],
    ['qualified table', { physicalTable: 'production.users' }],
    ['uppercase table', { physicalTable: 'Users' }],
    ['negative rows', { rowCount: -1 }],
    ['fractional rows', { rowCount: 1.5 }],
    ['empty minimum PK', { minPrimaryKey: '' }],
    ['invalid digest', { sha256: 'A'.repeat(64) }],
  ])('rejects an unsafe table inventory entry: %s', (_, override) => {
    const result = validateLegacySnapshotPackageManifest(
      { ...validManifest, tables: [{ ...validManifest.tables[0], ...override }] },
      policy
    )

    expect(result.success).toBe(false)
  })

  it('requires the schema and static-catalog digests to match the deployed policy', () => {
    expect(
      validateLegacySnapshotPackageManifest(
        {
          ...validManifest,
          schemaOnlySqlInventory: {
            ...validManifest.schemaOnlySqlInventory,
            sha256: 'e'.repeat(64),
          },
        },
        policy
      ).success
    ).toBe(false)
    expect(
      validateLegacySnapshotPackageManifest(
        {
          ...validManifest,
          staticCatalogInventory: {
            ...validManifest.staticCatalogInventory,
            sha256: 'f'.repeat(64),
          },
        },
        policy
      ).success
    ).toBe(false)
  })
})

describe('verifyLegacySnapshotPackage', () => {
  function createIo(
    override?: Partial<Awaited<ReturnType<LegacySnapshotPackageIo['inspectFile']>>>
  ): LegacySnapshotPackageIo {
    return {
      inspectFile: vi.fn(async (path, kind) => {
        const sha256 =
          path === validManifest.tables[0].path
            ? tableHash
            : path === validManifest.canonicalExportInventory.path
              ? canonicalExportRawHash
              : path === validManifest.schemaOnlySqlInventory.path
                ? schemaHash
                : path === validManifest.staticCatalogInventory.path
                  ? catalogHash
                  : imageHash
        return {
          isFile: true,
          isSymbolicLink: false,
          sizeBytes: kind === 'table' ? 100 : 30,
          sha256,
          ...(kind === 'table' ? { rowCount: 2 } : {}),
          ...override,
        }
      }),
    }
  }

  it('verifies every artifact through injected IO and returns aggregate metadata only', async () => {
    const io = createIo()

    const result = await verifyLegacySnapshotPackage(validManifest, policy, io)

    expect(result).toEqual({
      success: true,
      evidenceScope: 'artifact-integrity-only',
      checksumStatus: 'verified',
      verifiedFileCount: 5,
      verifiedTableCount: 1,
      verifiedRowCount: 2,
      verifiedByteCount: 220,
      manifestSha256,
      issues: [],
    })
    expect(io.inspectFile).toHaveBeenCalledTimes(5)
    expect(io.inspectFile).toHaveBeenCalledWith(
      'canonical/canonical-export.json',
      'canonical-export'
    )
    expect(io.inspectFile).toHaveBeenCalledWith('tables/customers.ndjson.gz', 'table')
  })

  it.each([
    ['checksum mismatch', { sha256: 'f'.repeat(64) }],
    ['row-count mismatch', { rowCount: 3 }],
    ['symbolic link', { isSymbolicLink: true }],
    ['non-file', { isFile: false }],
    ['invalid byte count', { sizeBytes: -1 }],
  ])('fails the whole package for a %s with a fully redacted report', async (_, override) => {
    const result = await verifyLegacySnapshotPackage(validManifest, policy, createIo(override))

    expect(result.success).toBe(false)
    expect(result.checksumStatus).toBe('failed')
    expect(result.verifiedFileCount).toBe(0)
    expect(result.verifiedTableCount).toBe(0)
    expect(result.verifiedRowCount).toBe(0)
    expect(result.verifiedByteCount).toBe(0)
    const serialized = JSON.stringify(result)
    expect(serialized).not.toContain('customers.ndjson')
    expect(serialized).not.toContain('gambit-front')
    expect(serialized).not.toContain('users')
    expect(serialized).not.toContain('customer-0001')
  })

  it('redacts injected IO errors and fails closed', async () => {
    const io: LegacySnapshotPackageIo = {
      inspectFile: vi.fn().mockRejectedValue(new Error('/private/export/passwords.txt missing')),
    }

    const result = await verifyLegacySnapshotPackage(validManifest, policy, io)

    expect(result.success).toBe(false)
    expect(result.checksumStatus).toBe('failed')
    expect(JSON.stringify(result)).not.toContain('/private/export')
    expect(JSON.stringify(result)).not.toContain('passwords')
  })

  it('does not touch injected IO when manifest validation fails', async () => {
    const io = createIo()

    const result = await verifyLegacySnapshotPackage({ ...validManifest, tables: [] }, policy, io)

    expect(result).toEqual({
      success: false,
      evidenceScope: 'none',
      checksumStatus: 'not-checked',
      verifiedFileCount: 0,
      verifiedTableCount: 0,
      verifiedRowCount: 0,
      verifiedByteCount: 0,
      issues: [
        {
          code: 'MANIFEST_REJECTED',
          message: 'Snapshot package manifest validation failed.',
        },
      ],
    })
    expect(io.inspectFile).not.toHaveBeenCalled()
  })
})

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`
  if (typeof value === 'object' && value !== null) {
    const record = value as Record<string, unknown>
    return `{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableJson(record[key])}`)
      .join(',')}}`
  }
  return JSON.stringify(value)
}
