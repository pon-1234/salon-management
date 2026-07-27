/**
 * @design_doc   docs/LEGACY_DATA_MIGRATION_RUNBOOK.md offline snapshot-package intake gate
 * @related_to   image-manifest.ts validates the optional public-image inventory referenced here
 * @known_issues Version 1 verifies immutable package artifacts but intentionally performs no import
 */
import { createHash } from 'node:crypto'

export type LegacySnapshotArtifactKind =
  | 'table'
  | 'canonical-export'
  | 'schema-only-sql'
  | 'static-catalog'
  | 'public-image-manifest'

export interface LegacySnapshotTableIdentity {
  origin: string
  physicalTable: string
}

export type LegacySnapshotTableUsage = 'canonical-source' | 'reconciliation-only'

export interface LegacySnapshotRequiredTable extends LegacySnapshotTableIdentity {
  usage: LegacySnapshotTableUsage
}

export interface LegacySnapshotPackagePolicy {
  expectedSourceKey: string
  expectedAuthoritativeOrigin: string
  expectedExtractorVersion: string
  expectedTransformationPolicyVersion: string
  requiredTables: readonly LegacySnapshotRequiredTable[]
  expectedSchemaOnlySqlSha256: string
  expectedStaticCatalogSha256: string
}

export interface LegacySnapshotTableInventory extends LegacySnapshotTableIdentity {
  usage: LegacySnapshotTableUsage
  path: string
  rowCount: number
  minPrimaryKey?: string
  maxPrimaryKey?: string
  sha256: string
}

export interface LegacySnapshotArtifactInventory {
  path: string
  /** SHA-256 of the exact artifact bytes, before any JSON normalization. */
  sha256: string
}

export interface LegacySnapshotPackageManifestV1 {
  version: 1
  sourceKey: string
  timezone: 'Asia/Tokyo'
  capturedAt: string
  cutoffAt: string
  authoritativeOrigin: string
  extractorVersion: string
  consistency: 'transaction-snapshot'
  canonicalExportInventory: LegacySnapshotArtifactInventory
  tables: LegacySnapshotTableInventory[]
  schemaOnlySqlInventory: LegacySnapshotArtifactInventory
  staticCatalogInventory: LegacySnapshotArtifactInventory
  publicImageManifest?: LegacySnapshotArtifactInventory
}

export interface LegacySnapshotManifestIssue {
  code:
    | 'CATALOG_DIGEST_MISMATCH'
    | 'DUPLICATE_PATH'
    | 'DUPLICATE_TABLE'
    | 'EMPTY_TABLE_INVENTORY'
    | 'EXTRACTOR_VERSION_MISMATCH'
    | 'INVALID_ARTIFACT'
    | 'INVALID_CONSISTENCY'
    | 'INVALID_DIGEST'
    | 'INVALID_EXTRACTOR_VERSION'
    | 'INVALID_MANIFEST'
    | 'INVALID_OPAQUE_ID'
    | 'INVALID_PATH'
    | 'INVALID_POLICY'
    | 'INVALID_PRIMARY_KEY'
    | 'INVALID_ROW_COUNT'
    | 'INVALID_TABLE'
    | 'INVALID_TABLE_USAGE'
    | 'INVALID_TIMESTAMP'
    | 'INVALID_TIMEZONE'
    | 'INVALID_TIME_RANGE'
    | 'MISSING_REQUIRED_TABLE'
    | 'ORIGIN_MISMATCH'
    | 'SCHEMA_DIGEST_MISMATCH'
    | 'SOURCE_MISMATCH'
    | 'TABLE_NOT_ALLOWED'
    | 'TABLE_USAGE_MISMATCH'
    | 'UNSUPPORTED_FIELD'
    | 'UNSUPPORTED_VERSION'
  message: string
}

export type LegacySnapshotManifestValidation =
  | {
      success: true
      data: LegacySnapshotPackageManifestV1
      manifestSha256: string
      issues: []
    }
  | { success: false; issues: LegacySnapshotManifestIssue[] }

export interface LegacySnapshotFileInspection {
  isFile: boolean
  isSymbolicLink: boolean
  sizeBytes: number
  sha256: string
  rowCount?: number
}

export interface LegacySnapshotPackageIo {
  inspectFile: (
    relativePath: string,
    kind: LegacySnapshotArtifactKind
  ) => Promise<LegacySnapshotFileInspection>
}

export interface LegacySnapshotVerificationIssue {
  code:
    | 'CHECKSUM_MISMATCH'
    | 'FILE_NOT_REGULAR'
    | 'FILE_UNREADABLE'
    | 'INVALID_INSPECTION'
    | 'MANIFEST_REJECTED'
    | 'ROW_COUNT_MISMATCH'
    | 'SYMLINK_FORBIDDEN'
  message: string
}

export type LegacySnapshotPackageVerificationResult =
  | {
      success: true
      evidenceScope: 'artifact-integrity-only'
      checksumStatus: 'verified'
      verifiedFileCount: number
      verifiedTableCount: number
      verifiedRowCount: number
      verifiedByteCount: number
      manifestSha256: string
      issues: []
    }
  | {
      success: false
      evidenceScope: 'none'
      checksumStatus: 'failed' | 'not-checked'
      verifiedFileCount: 0
      verifiedTableCount: 0
      verifiedRowCount: 0
      verifiedByteCount: 0
      issues: LegacySnapshotVerificationIssue[]
    }

const TOP_LEVEL_FIELDS = new Set([
  'version',
  'sourceKey',
  'timezone',
  'capturedAt',
  'cutoffAt',
  'authoritativeOrigin',
  'extractorVersion',
  'consistency',
  'canonicalExportInventory',
  'tables',
  'schemaOnlySqlInventory',
  'staticCatalogInventory',
  'publicImageManifest',
])
const TABLE_FIELDS = new Set([
  'origin',
  'physicalTable',
  'usage',
  'path',
  'rowCount',
  'minPrimaryKey',
  'maxPrimaryKey',
  'sha256',
])
const ARTIFACT_FIELDS = new Set(['path', 'sha256'])
const SHA256_PATTERN = /^[a-f0-9]{64}$/u
const OPAQUE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/u
const EXTRACTOR_VERSION_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._+-]{0,63}$/u
const LOGICAL_ORIGIN_PATTERN = /^[a-z][a-z0-9_]{0,63}$/u
const PHYSICAL_TABLE_PATTERN = /^[a-z][a-z0-9_]{0,62}$/u
const SAFE_PATH_PATTERN = /^[A-Za-z0-9._/-]+$/u
const WINDOWS_ABSOLUTE_PATH_PATTERN = /^[A-Za-z]:\//u
const SENSITIVE_PATH_TOKEN_PATTERN =
  /(?:^|[._/-])(?:api[_-]?key|auth|cnf|conf|config|configuration|credential|credentials|env|environment|key|keystore|passwd|password|passwords|private[_-]?key|secret|secrets|token|tokens)(?:[._/-]|$)/iu
const TIMESTAMP_PATTERN =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?(Z|([+-])(\d{2}):(\d{2}))$/u
const MANIFEST_HASH_DOMAIN = 'salon-management:legacy-snapshot-package-manifest:v1\0'

type ArtifactPathRole =
  | 'canonical-export'
  | 'schema-only-sql'
  | 'static-catalog'
  | 'public-image-manifest'

interface VerifiedArtifact {
  path: string
  sha256: string
  kind: LegacySnapshotArtifactKind
  expectedRowCount?: number
}

export function deriveLegacyApprovedSourceTables(
  manifest: LegacySnapshotPackageManifestV1
): string[] {
  const qualifiedTables = manifest.tables
    .filter(({ rowCount, usage }) => usage === 'canonical-source' && rowCount > 0)
    .map(({ origin, physicalTable }) => {
      if (!validateLogicalOrigin(origin) || !validatePhysicalTable(physicalTable)) {
        throw new Error('[legacy snapshot] Qualified source table derivation failed.')
      }
      return `${origin}.${physicalTable}`
    })
  if (new Set(qualifiedTables).size !== qualifiedTables.length) {
    throw new Error('[legacy snapshot] Qualified source table derivation failed.')
  }
  return qualifiedTables.sort((left, right) => left.localeCompare(right, 'en'))
}

export function validateLegacySnapshotPackageManifest(
  input: unknown,
  policy: LegacySnapshotPackagePolicy
): LegacySnapshotManifestValidation {
  const issues: LegacySnapshotManifestIssue[] = []
  if (!isPolicyValid(policy)) {
    return failure('INVALID_POLICY', 'Snapshot validation policy is invalid.')
  }
  if (!isRecord(input)) {
    return failure('INVALID_MANIFEST', 'Snapshot package manifest must be an object.')
  }

  appendUnknownFields(input, TOP_LEVEL_FIELDS, issues)

  if (input.version !== 1) {
    issues.push(issue('UNSUPPORTED_VERSION', 'Snapshot package version must be 1.'))
  }

  const sourceKey = validateOpaqueId(input.sourceKey)
  if (!sourceKey || sourceKey !== policy.expectedSourceKey) {
    issues.push(issue('SOURCE_MISMATCH', 'Snapshot source is not the approved source.'))
  }

  if (input.timezone !== 'Asia/Tokyo') {
    issues.push(issue('INVALID_TIMEZONE', 'Snapshot timezone must be Asia/Tokyo.'))
  }

  const capturedAt = parseTimezoneQualifiedTimestamp(input.capturedAt)
  const cutoffAt = parseTimezoneQualifiedTimestamp(input.cutoffAt)
  if (!capturedAt) {
    issues.push(issue('INVALID_TIMESTAMP', 'Snapshot capturedAt is not a valid timestamp.'))
  }
  if (!cutoffAt) {
    issues.push(issue('INVALID_TIMESTAMP', 'Snapshot cutoffAt is not a valid timestamp.'))
  }
  if (capturedAt && cutoffAt && capturedAt.epochMilliseconds > cutoffAt.epochMilliseconds) {
    issues.push(issue('INVALID_TIME_RANGE', 'Snapshot capture time must not be after its cutoff.'))
  }

  const authoritativeOrigin = validateOpaqueId(input.authoritativeOrigin)
  if (!authoritativeOrigin || authoritativeOrigin !== policy.expectedAuthoritativeOrigin) {
    issues.push(issue('ORIGIN_MISMATCH', 'Snapshot origin is not the approved origin.'))
  }

  const extractorVersion = validateExtractorVersion(input.extractorVersion)
  if (!extractorVersion) {
    issues.push(
      issue('INVALID_EXTRACTOR_VERSION', 'Extractor version must be a non-empty opaque version.')
    )
  } else if (extractorVersion !== policy.expectedExtractorVersion) {
    issues.push(issue('EXTRACTOR_VERSION_MISMATCH', 'Extractor version is not approved by policy.'))
  }

  if (input.consistency !== 'transaction-snapshot') {
    issues.push(issue('INVALID_CONSISTENCY', 'Snapshot consistency must be transaction-snapshot.'))
  }

  const canonicalExportInventory = parseArtifact(
    input.canonicalExportInventory,
    'canonical-export',
    issues
  )
  const tables = parseTables(input.tables, policy, issues)
  appendMissingRequiredTableIssues(tables, policy.requiredTables, issues)
  if (new Set(tables.map(({ origin }) => origin)).size > 1) {
    issues.push(
      issue(
        'INVALID_CONSISTENCY',
        'Snapshot package version 1 cannot prove one transaction across multiple origins.'
      )
    )
  }
  const schemaOnlySqlInventory = parseArtifact(
    input.schemaOnlySqlInventory,
    'schema-only-sql',
    issues
  )
  const staticCatalogInventory = parseArtifact(
    input.staticCatalogInventory,
    'static-catalog',
    issues
  )
  const publicImageManifest = Object.prototype.hasOwnProperty.call(input, 'publicImageManifest')
    ? parseArtifact(input.publicImageManifest, 'public-image-manifest', issues)
    : undefined

  if (
    schemaOnlySqlInventory &&
    schemaOnlySqlInventory.sha256 !== policy.expectedSchemaOnlySqlSha256
  ) {
    issues.push(
      issue('SCHEMA_DIGEST_MISMATCH', 'Schema inventory does not match the approved schema.')
    )
  }
  if (
    staticCatalogInventory &&
    staticCatalogInventory.sha256 !== policy.expectedStaticCatalogSha256
  ) {
    issues.push(
      issue('CATALOG_DIGEST_MISMATCH', 'Static catalog does not match the deployed catalog.')
    )
  }

  appendDuplicatePathIssues(
    [
      canonicalExportInventory?.path,
      ...tables.map((table) => table.path),
      schemaOnlySqlInventory?.path,
      staticCatalogInventory?.path,
      publicImageManifest?.path,
    ],
    issues
  )

  if (
    issues.length > 0 ||
    !sourceKey ||
    !capturedAt ||
    !cutoffAt ||
    !authoritativeOrigin ||
    !extractorVersion ||
    !canonicalExportInventory ||
    !schemaOnlySqlInventory ||
    !staticCatalogInventory ||
    (Object.prototype.hasOwnProperty.call(input, 'publicImageManifest') && !publicImageManifest)
  ) {
    return { success: false, issues }
  }

  const data: LegacySnapshotPackageManifestV1 = {
    version: 1,
    sourceKey,
    timezone: 'Asia/Tokyo',
    capturedAt: capturedAt.source,
    cutoffAt: cutoffAt.source,
    authoritativeOrigin,
    extractorVersion,
    consistency: 'transaction-snapshot',
    canonicalExportInventory,
    tables,
    schemaOnlySqlInventory,
    staticCatalogInventory,
    ...(publicImageManifest ? { publicImageManifest } : {}),
  }
  return {
    success: true,
    data,
    manifestSha256: hashNormalizedManifest(data),
    issues: [],
  }
}

export async function verifyLegacySnapshotPackage(
  input: unknown,
  policy: LegacySnapshotPackagePolicy,
  io: LegacySnapshotPackageIo
): Promise<LegacySnapshotPackageVerificationResult> {
  const validation = validateLegacySnapshotPackageManifest(input, policy)
  if (!validation.success) {
    return rejectedResult('not-checked', [
      issue('MANIFEST_REJECTED', 'Snapshot package manifest validation failed.'),
    ])
  }

  const manifest = validation.data
  const artifacts: VerifiedArtifact[] = [
    {
      ...manifest.canonicalExportInventory,
      kind: 'canonical-export',
    },
    ...manifest.tables.map((table) => ({
      path: table.path,
      sha256: table.sha256,
      kind: 'table' as const,
      expectedRowCount: table.rowCount,
    })),
    {
      ...manifest.schemaOnlySqlInventory,
      kind: 'schema-only-sql',
    },
    {
      ...manifest.staticCatalogInventory,
      kind: 'static-catalog',
    },
    ...(manifest.publicImageManifest
      ? [{ ...manifest.publicImageManifest, kind: 'public-image-manifest' as const }]
      : []),
  ]
  const issues: LegacySnapshotVerificationIssue[] = []
  let verifiedByteCount = 0
  let verifiedRowCount = 0

  for (const artifact of artifacts) {
    let inspection: LegacySnapshotFileInspection
    try {
      inspection = await io.inspectFile(artifact.path, artifact.kind)
    } catch {
      issues.push(issue('FILE_UNREADABLE', 'A snapshot artifact could not be inspected.'))
      continue
    }

    if (inspection.isSymbolicLink) {
      issues.push(issue('SYMLINK_FORBIDDEN', 'Snapshot artifacts must not be symbolic links.'))
      continue
    }
    if (!inspection.isFile) {
      issues.push(issue('FILE_NOT_REGULAR', 'A snapshot artifact is not a regular file.'))
      continue
    }
    if (
      !Number.isSafeInteger(inspection.sizeBytes) ||
      inspection.sizeBytes < 0 ||
      !SHA256_PATTERN.test(inspection.sha256)
    ) {
      issues.push(issue('INVALID_INSPECTION', 'Snapshot artifact inspection metadata is invalid.'))
      continue
    }
    if (inspection.sha256 !== artifact.sha256) {
      issues.push(issue('CHECKSUM_MISMATCH', 'A snapshot artifact checksum does not match.'))
      continue
    }
    if (artifact.kind === 'table') {
      const inspectedRowCount = inspection.rowCount
      if (
        typeof inspectedRowCount !== 'number' ||
        !Number.isSafeInteger(inspectedRowCount) ||
        inspectedRowCount < 0
      ) {
        issues.push(issue('INVALID_INSPECTION', 'Snapshot table inspection metadata is invalid.'))
        continue
      }
      if (inspectedRowCount !== artifact.expectedRowCount) {
        issues.push(issue('ROW_COUNT_MISMATCH', 'A snapshot table row count does not match.'))
        continue
      }
      if (!canAddSafely(verifiedRowCount, inspectedRowCount)) {
        issues.push(issue('INVALID_INSPECTION', 'Snapshot row total exceeds the safe limit.'))
        continue
      }
      verifiedRowCount += inspectedRowCount
    }
    if (!canAddSafely(verifiedByteCount, inspection.sizeBytes)) {
      issues.push(issue('INVALID_INSPECTION', 'Snapshot byte total exceeds the safe limit.'))
      continue
    }
    verifiedByteCount += inspection.sizeBytes
  }

  if (issues.length > 0) {
    return rejectedResult('failed', issues)
  }

  return {
    success: true,
    evidenceScope: 'artifact-integrity-only',
    checksumStatus: 'verified',
    verifiedFileCount: artifacts.length,
    verifiedTableCount: manifest.tables.length,
    verifiedRowCount,
    verifiedByteCount,
    manifestSha256: validation.manifestSha256,
    issues: [],
  }
}

function parseTables(
  value: unknown,
  policy: LegacySnapshotPackagePolicy,
  issues: LegacySnapshotManifestIssue[]
): LegacySnapshotTableInventory[] {
  if (!Array.isArray(value)) {
    issues.push(issue('INVALID_MANIFEST', 'Snapshot table inventory must be an array.'))
    return []
  }
  if (value.length === 0) {
    issues.push(issue('EMPTY_TABLE_INVENTORY', 'Snapshot table inventory must not be empty.'))
    return []
  }

  const tables: LegacySnapshotTableInventory[] = []
  const physicalIdentities = new Set<string>()
  for (const candidate of value) {
    if (!isRecord(candidate)) {
      issues.push(issue('INVALID_TABLE', 'Each snapshot table inventory entry must be an object.'))
      continue
    }

    const issueCountBefore = issues.length
    appendUnknownFields(candidate, TABLE_FIELDS, issues)
    const origin = validateLogicalOrigin(candidate.origin)
    const physicalTable = validatePhysicalTable(candidate.physicalTable)
    const usage = parseTableUsage(candidate.usage)
    if (!origin || !physicalTable) {
      issues.push(issue('INVALID_TABLE', 'Snapshot table identity is invalid.'))
    } else {
      const requiredTable = findRequiredTable(origin, physicalTable, policy.requiredTables)
      if (!requiredTable) {
        issues.push(
          issue('TABLE_NOT_ALLOWED', 'Snapshot table is not present in the required policy.')
        )
      } else if (usage && requiredTable.usage !== usage) {
        issues.push(
          issue('TABLE_USAGE_MISMATCH', 'Snapshot table usage differs from the required policy.')
        )
      }
    }
    if (!usage) {
      issues.push(
        issue(
          'INVALID_TABLE_USAGE',
          'Snapshot table usage must be canonical-source or reconciliation-only.'
        )
      )
    }

    const identity = origin && physicalTable ? `${origin}\0${physicalTable}` : null
    if (identity) {
      if (physicalIdentities.has(identity)) {
        issues.push(issue('DUPLICATE_TABLE', 'Snapshot table identities must be unique.'))
      }
      physicalIdentities.add(identity)
    }

    const path = validateRelativePath(candidate.path, 'table', issues)
    const rowCount = candidate.rowCount
    if (!Number.isSafeInteger(rowCount) || (rowCount as number) < 0) {
      issues.push(issue('INVALID_ROW_COUNT', 'Snapshot row count must be a non-negative integer.'))
    }

    const minPrimaryKey = parseOptionalPrimaryKey(candidate, 'minPrimaryKey', issues)
    const maxPrimaryKey = parseOptionalPrimaryKey(candidate, 'maxPrimaryKey', issues)
    const sha256 = validateDigest(candidate.sha256, issues)

    if (
      issues.length === issueCountBefore &&
      origin &&
      physicalTable &&
      usage &&
      path &&
      Number.isSafeInteger(rowCount) &&
      (rowCount as number) >= 0 &&
      sha256
    ) {
      tables.push({
        origin,
        physicalTable,
        usage,
        path,
        rowCount: rowCount as number,
        ...(minPrimaryKey !== undefined ? { minPrimaryKey } : {}),
        ...(maxPrimaryKey !== undefined ? { maxPrimaryKey } : {}),
        sha256,
      })
    }
  }
  return tables
}

function parseTableUsage(value: unknown): LegacySnapshotTableUsage | null {
  return value === 'canonical-source' || value === 'reconciliation-only' ? value : null
}

function parseArtifact(
  value: unknown,
  role: ArtifactPathRole,
  issues: LegacySnapshotManifestIssue[]
): LegacySnapshotArtifactInventory | null {
  if (!isRecord(value)) {
    issues.push(issue('INVALID_ARTIFACT', 'Snapshot artifact inventory must be an object.'))
    return null
  }
  const issueCountBefore = issues.length
  appendUnknownFields(value, ARTIFACT_FIELDS, issues)
  const path = validateRelativePath(value.path, role, issues)
  const sha256 = validateDigest(value.sha256, issues)
  return issues.length === issueCountBefore && path && sha256 ? { path, sha256 } : null
}

function validateRelativePath(
  value: unknown,
  role: LegacySnapshotArtifactKind,
  issues: LegacySnapshotManifestIssue[]
): string | null {
  if (typeof value !== 'string') {
    issues.push(issue('INVALID_PATH', 'Snapshot artifact path is invalid.'))
    return null
  }
  const segments = value.split('/')
  const unsafe =
    value.length === 0 ||
    value.length > 512 ||
    value !== value.normalize('NFKC') ||
    !SAFE_PATH_PATTERN.test(value) ||
    value.startsWith('/') ||
    WINDOWS_ABSOLUTE_PATH_PATTERN.test(value) ||
    value.includes('\\') ||
    value.includes('\0') ||
    segments.some((segment) => segment.length === 0 || segment === '.' || segment === '..') ||
    SENSITIVE_PATH_TOKEN_PATTERN.test(value)
  const extensionMatches =
    role === 'table'
      ? /\.ndjson(?:\.gz)?$/u.test(value)
      : role === 'schema-only-sql'
        ? /\.schema\.sql$/u.test(value)
        : /\.json$/u.test(value)
  if (unsafe || !extensionMatches) {
    issues.push(issue('INVALID_PATH', 'Snapshot artifact path is invalid for its role.'))
    return null
  }
  return value
}

function appendDuplicatePathIssues(
  paths: Array<string | undefined>,
  issues: LegacySnapshotManifestIssue[]
): void {
  const seen = new Set<string>()
  for (const path of paths) {
    if (!path) continue
    if (seen.has(path)) {
      issues.push(issue('DUPLICATE_PATH', 'Snapshot artifact paths must be unique.'))
    }
    seen.add(path)
  }
}

function parseOptionalPrimaryKey(
  input: Record<string, unknown>,
  field: 'minPrimaryKey' | 'maxPrimaryKey',
  issues: LegacySnapshotManifestIssue[]
): string | undefined {
  if (!Object.prototype.hasOwnProperty.call(input, field)) return undefined
  const value = input[field]
  if (
    typeof value !== 'string' ||
    value.length === 0 ||
    value.length > 256 ||
    /[\u0000-\u001f\u007f]/u.test(value)
  ) {
    issues.push(issue('INVALID_PRIMARY_KEY', 'Snapshot primary-key boundary is invalid.'))
    return undefined
  }
  return value
}

function validateDigest(value: unknown, issues: LegacySnapshotManifestIssue[]): string | null {
  if (typeof value !== 'string' || !SHA256_PATTERN.test(value)) {
    issues.push(issue('INVALID_DIGEST', 'Snapshot checksum must be a lowercase SHA-256 digest.'))
    return null
  }
  return value
}

function validateOpaqueId(value: unknown): string | null {
  return typeof value === 'string' && OPAQUE_ID_PATTERN.test(value) ? value : null
}

function validateExtractorVersion(value: unknown): string | null {
  return typeof value === 'string' && EXTRACTOR_VERSION_PATTERN.test(value) ? value : null
}

function validateLogicalOrigin(value: unknown): string | null {
  return typeof value === 'string' && LOGICAL_ORIGIN_PATTERN.test(value) ? value : null
}

function validatePhysicalTable(value: unknown): string | null {
  return typeof value === 'string' && PHYSICAL_TABLE_PATTERN.test(value) ? value : null
}

function findRequiredTable(
  origin: string,
  physicalTable: string,
  requiredTables: readonly LegacySnapshotRequiredTable[]
): LegacySnapshotRequiredTable | null {
  return (
    requiredTables.find(
      (allowed) => allowed.origin === origin && allowed.physicalTable === physicalTable
    ) ?? null
  )
}

function appendMissingRequiredTableIssues(
  tables: readonly LegacySnapshotTableInventory[],
  requiredTables: readonly LegacySnapshotRequiredTable[],
  issues: LegacySnapshotManifestIssue[]
): void {
  const present = new Set(tables.map(({ origin, physicalTable }) => `${origin}\0${physicalTable}`))
  for (const required of requiredTables) {
    if (present.has(`${required.origin}\0${required.physicalTable}`)) continue
    issues.push(
      issue('MISSING_REQUIRED_TABLE', 'Snapshot package omits a table required by policy.')
    )
  }
}

function isPolicyValid(policy: LegacySnapshotPackagePolicy): boolean {
  return (
    validateOpaqueId(policy.expectedSourceKey) !== null &&
    validateOpaqueId(policy.expectedAuthoritativeOrigin) !== null &&
    validateExtractorVersion(policy.expectedExtractorVersion) !== null &&
    validateExtractorVersion(policy.expectedTransformationPolicyVersion) !== null &&
    SHA256_PATTERN.test(policy.expectedSchemaOnlySqlSha256) &&
    SHA256_PATTERN.test(policy.expectedStaticCatalogSha256) &&
    policy.requiredTables.length > 0 &&
    policy.requiredTables.every(
      (table) =>
        validateLogicalOrigin(table.origin) !== null &&
        validatePhysicalTable(table.physicalTable) !== null &&
        parseTableUsage(table.usage) !== null
    ) &&
    new Set(policy.requiredTables.map(({ origin, physicalTable }) => `${origin}\0${physicalTable}`))
      .size === policy.requiredTables.length
  )
}

function parseTimezoneQualifiedTimestamp(
  value: unknown
): { source: string; epochMilliseconds: number } | null {
  if (typeof value !== 'string') return null
  const match = TIMESTAMP_PATTERN.exec(value)
  if (!match) return null

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const hour = Number(match[4])
  const minute = Number(match[5])
  const second = Number(match[6])
  const millisecond = Number((match[7] ?? '').padEnd(3, '0'))
  const offsetHour = match[8] === 'Z' ? 0 : Number(match[10])
  const offsetMinute = match[8] === 'Z' ? 0 : Number(match[11])
  if (
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31 ||
    hour > 23 ||
    minute > 59 ||
    second > 59 ||
    offsetHour > 14 ||
    offsetMinute > 59 ||
    (offsetHour === 14 && offsetMinute !== 0)
  ) {
    return null
  }

  const localDate = new Date(0)
  localDate.setUTCFullYear(year, month - 1, day)
  localDate.setUTCHours(hour, minute, second, millisecond)
  if (
    localDate.getUTCFullYear() !== year ||
    localDate.getUTCMonth() !== month - 1 ||
    localDate.getUTCDate() !== day ||
    localDate.getUTCHours() !== hour ||
    localDate.getUTCMinutes() !== minute ||
    localDate.getUTCSeconds() !== second ||
    localDate.getUTCMilliseconds() !== millisecond
  ) {
    return null
  }

  const offsetSign = match[9] === '-' ? -1 : 1
  const offsetMilliseconds =
    match[8] === 'Z' ? 0 : offsetSign * (offsetHour * 60 + offsetMinute) * 60_000
  const epochMilliseconds = localDate.getTime() - offsetMilliseconds
  return Number.isFinite(epochMilliseconds) ? { source: value, epochMilliseconds } : null
}

function appendUnknownFields(
  input: Record<string, unknown>,
  supported: ReadonlySet<string>,
  issues: LegacySnapshotManifestIssue[]
): void {
  for (const field of Object.keys(input)) {
    if (!supported.has(field)) {
      issues.push(issue('UNSUPPORTED_FIELD', 'Snapshot manifest contains an unsupported field.'))
    }
  }
}

function rejectedResult(
  checksumStatus: 'failed' | 'not-checked',
  issues: LegacySnapshotVerificationIssue[]
): Extract<LegacySnapshotPackageVerificationResult, { success: false }> {
  return {
    success: false,
    evidenceScope: 'none',
    checksumStatus,
    verifiedFileCount: 0,
    verifiedTableCount: 0,
    verifiedRowCount: 0,
    verifiedByteCount: 0,
    issues,
  }
}

function hashNormalizedManifest(manifest: LegacySnapshotPackageManifestV1): string {
  return createHash('sha256')
    .update(MANIFEST_HASH_DOMAIN, 'utf8')
    .update(stableJson(manifest), 'utf8')
    .digest('hex')
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`
  if (isRecord(value)) {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`)
      .join(',')}}`
  }
  const serialized = JSON.stringify(value)
  if (serialized === undefined) {
    throw new Error('Normalized snapshot manifest contains a non-JSON value.')
  }
  return serialized
}

function failure(
  code: LegacySnapshotManifestIssue['code'],
  message: string
): Extract<LegacySnapshotManifestValidation, { success: false }> {
  return { success: false, issues: [issue(code, message)] }
}

function issue<TCode extends string>(
  code: TCode,
  message: string
): { code: TCode; message: string } {
  return { code, message }
}

function canAddSafely(left: number, right: number): boolean {
  return Number.isSafeInteger(left + right)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
