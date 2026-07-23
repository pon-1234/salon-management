/**
 * @design_doc   docs/LEGACY_DATA_MIGRATION_RUNBOOK.md staging preview preparation contract
 * @related_to   dry-run.ts validates canonical rows; a future persistence adapter consumes the prepared hashes
 * @known_issues This pure module does not connect to PostgreSQL or prove that a target is staging
 */
import { createHash } from 'node:crypto'

import { runLegacyMigrationDryRun } from './dry-run'
import {
  LEGACY_ENTITY_NAMES,
  type LegacyEntityName,
  type LegacyMigrationRecords,
  type LegacyMigrationReconciliation,
} from './types'

const SHA256_PATTERN = /^[a-f0-9]{64}$/u
const CANONICAL_UTC_TIMESTAMP_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u
const VERSION_LABEL_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/u
const QUALIFIED_PHYSICAL_TABLE_PATTERN = /^[A-Za-z_][A-Za-z0-9_$]*\.[A-Za-z_][A-Za-z0-9_$]*$/u

export interface LegacyPreviewImportControlV1 {
  version: 1
  sourceKey: string
  cutoffAt: string
  migrationManifestSha256: string
  canonicalExportSha256: string
  snapshotManifestSha256: string
  extractorVersion: string
  transformationPolicyVersion: string
  approvedSourceTables: string[]
  expectedInputCounts: Record<LegacyEntityName, number>
}

export interface LegacyPreviewPreparationCapabilities {
  customerCredential?: 'generated-disabled-password-hash'
}

export interface LegacyPreparedRecord<Entity extends LegacyEntityName = LegacyEntityName> {
  record: LegacyMigrationRecords[Entity][number]
  sourceHash: string
}

export type LegacyPreparedRecords = {
  [Entity in LegacyEntityName]: LegacyPreparedRecord<Entity>[]
}

export interface PreparedLegacyPreviewImport {
  version: 1
  sourceKey: string
  cutoffAt: string
  migrationManifestSha256: string
  canonicalExportSha256: string
  snapshotManifestSha256: string
  extractorVersion: string
  transformationPolicyVersion: string
  approvedSourceTables: string[]
  canonicalDigest: string
  reconciliation: LegacyMigrationReconciliation
  records: LegacyPreparedRecords
}

export type LegacyPreviewPreparedDigestInput = Omit<PreparedLegacyPreviewImport, 'canonicalDigest'>

export interface LegacyPreviewPreparationIssue {
  code:
    | 'COUNT_MISMATCH'
    | 'DRY_RUN_BLOCKED'
    | 'EMPTY_SNAPSHOT'
    | 'EXPORT_SHA256_MISMATCH'
    | 'FUTURE_CUTOFF'
    | 'INVALID_CAPABILITIES'
    | 'INVALID_APPROVED_SOURCE_TABLES'
    | 'INVALID_CONTROL'
    | 'INVALID_CUTOFF'
    | 'INVALID_EXPECTED_COUNT'
    | 'INVALID_EXPORT'
    | 'INVALID_MANIFEST'
    | 'INVALID_SHA256'
    | 'INVALID_SOURCE_IDENTITY'
    | 'MISSING_PREVIEW_CREATED_AT'
    | 'MISSING_PERSISTENCE_CAPABILITY'
    | 'MANIFEST_SHA256_MISMATCH'
    | 'POINT_BALANCE_MISMATCH'
    | 'POINT_RESERVATION_USAGE_MISMATCH'
    | 'RECORD_AFTER_CUTOFF'
    | 'SOURCE_KEY_MISMATCH'
    | 'UNAPPROVED_WARNING'
    | 'UNAPPROVED_SOURCE_TABLE'
    | 'UNSUPPORTED_CONTROL_FIELD'
    | 'UNSUPPORTED_CONTROL_VERSION'
    | 'UNUSED_APPROVED_SOURCE_TABLE'
  path: string
  message: string
  entity?: LegacyEntityName
  field?: string
}

export type LegacyPreviewPreparationResult =
  | { success: true; prepared: PreparedLegacyPreviewImport; issues: [] }
  | { success: false; prepared: null; issues: LegacyPreviewPreparationIssue[] }

export function calculateLegacyCanonicalJsonSha256(value: unknown): string {
  return sha256(`legacy-preview-export:v1\0${stableJson(value)}`)
}

export function calculateLegacyMigrationManifestSha256(value: unknown): string {
  return sha256(`legacy-preview-migration-manifest:v1\0${stableJson(value)}`)
}

export function isQualifiedLegacyPhysicalTable(value: unknown): value is string {
  return typeof value === 'string' && QUALIFIED_PHYSICAL_TABLE_PATTERN.test(value)
}

export function calculateLegacyPreviewRecordSha256(
  entity: LegacyEntityName,
  record: unknown
): string {
  return sha256(`legacy-preview-row:v1:${entity}\0${stableJson(record)}`)
}

export function calculateLegacyPreviewPreparedDigest(
  prepared: LegacyPreviewPreparedDigestInput
): string {
  return sha256(
    `legacy-preview-prepared:v1\0${stableJson({
      version: prepared.version,
      sourceKey: prepared.sourceKey,
      cutoffAt: prepared.cutoffAt,
      migrationManifestSha256: prepared.migrationManifestSha256,
      canonicalExportSha256: prepared.canonicalExportSha256,
      snapshotManifestSha256: prepared.snapshotManifestSha256,
      extractorVersion: prepared.extractorVersion,
      transformationPolicyVersion: prepared.transformationPolicyVersion,
      approvedSourceTables: prepared.approvedSourceTables,
      reconciliation: prepared.reconciliation,
      records: prepared.records,
    })}`
  )
}

export function prepareLegacyPreviewImport(
  manifestInput: unknown,
  exportInput: unknown,
  controlInput: unknown,
  capabilitiesInput: unknown,
  now: Date = new Date()
): LegacyPreviewPreparationResult {
  const controlValidation = validateControl(controlInput, now)
  const capabilityValidation = validateCapabilities(capabilitiesInput)
  const issues = [...controlValidation.issues, ...capabilityValidation.issues]

  let observedManifestSha256: string | null = null
  try {
    observedManifestSha256 = calculateLegacyMigrationManifestSha256(manifestInput)
  } catch {
    issues.push({
      code: 'INVALID_MANIFEST',
      path: '$.manifest',
      message: 'Manifest must contain only finite JSON values without circular references.',
    })
  }

  let observedExportSha256: string | null = null
  try {
    observedExportSha256 = calculateLegacyCanonicalJsonSha256(exportInput)
  } catch {
    issues.push({
      code: 'INVALID_EXPORT',
      path: '$.export',
      message: 'Export must contain only finite JSON values without circular references.',
    })
  }

  if (controlValidation.control && observedExportSha256) {
    if (controlValidation.control.canonicalExportSha256 !== observedExportSha256) {
      issues.push({
        code: 'EXPORT_SHA256_MISMATCH',
        path: '$.control.canonicalExportSha256',
        message: 'The canonical export SHA-256 does not match the approved control.',
      })
    }

    const exportSourceKey = readExportSourceKey(exportInput)
    if (exportSourceKey !== controlValidation.control.sourceKey) {
      issues.push({
        code: 'SOURCE_KEY_MISMATCH',
        path: '$.control.sourceKey',
        message: 'The approved source key does not match the canonical export.',
      })
    }
  }

  if (
    controlValidation.control &&
    observedManifestSha256 &&
    controlValidation.control.migrationManifestSha256 !== observedManifestSha256
  ) {
    issues.push({
      code: 'MANIFEST_SHA256_MISMATCH',
      path: '$.control.migrationManifestSha256',
      message: 'The migration manifest SHA-256 does not match the approved control.',
    })
  }

  const dryRun = runLegacyMigrationDryRun(manifestInput, exportInput)
  if (!dryRun.transformed || !dryRun.result || !dryRun.report) {
    dryRun.inputIssues.forEach((inputIssue) => {
      issues.push({
        code: 'DRY_RUN_BLOCKED',
        path: inputIssue.path,
        message: inputIssue.message,
      })
    })
    return failed(issues)
  }

  if (controlValidation.control) {
    let totalInputRows = 0
    for (const entity of LEGACY_ENTITY_NAMES) {
      const actualCount = dryRun.result.reconciliation[entity].input
      const expectedCount = controlValidation.control.expectedInputCounts[entity]
      totalInputRows += actualCount
      if (actualCount !== expectedCount) {
        issues.push({
          code: 'COUNT_MISMATCH',
          path: `$.control.expectedInputCounts.${entity}`,
          message: `Approved ${entity} count does not match the canonical export.`,
          entity,
        })
      }
    }
    if (totalInputRows === 0) {
      issues.push({
        code: 'EMPTY_SNAPSHOT',
        path: '$.export.rows',
        message: 'An all-empty canonical snapshot cannot be prepared for staging persistence.',
      })
    }
  }

  const canCreateDisabledCustomerCredential =
    capabilityValidation.capabilities?.customerCredential === 'generated-disabled-password-hash'
  const passwordBlockers = dryRun.result.issues.filter(isCustomerPasswordBlocker)
  if (passwordBlockers.length > 0 && !canCreateDisabledCustomerCredential) {
    issues.push({
      code: 'MISSING_PERSISTENCE_CAPABILITY',
      path: '$.capabilities.customerCredential',
      message: 'A disabled customer password hash capability is required for preview preparation.',
      entity: 'customers',
      field: 'password',
    })
  }

  dryRun.result.issues
    .filter(
      (issue) =>
        issue.severity === 'error' &&
        !(canCreateDisabledCustomerCredential && isCustomerPasswordBlocker(issue))
    )
    .forEach((issue) => {
      issues.push({
        code: 'DRY_RUN_BLOCKED',
        path: `$.export.rows.${issue.entity}[${issue.rowIndex}]`,
        message: `${issue.code}: ${issue.message}`,
        entity: issue.entity,
        ...(issue.field ? { field: issue.field } : {}),
      })
    })

  appendPreviewRecordIssues(dryRun.result.records, issues)
  appendPointBalanceIssues(dryRun.result.records, issues)
  appendReservationPointUsageIssues(dryRun.result.records, issues)
  if (controlValidation.control) {
    appendRecordAfterCutoffIssues(dryRun.result.records, controlValidation.control.cutoffAt, issues)
    appendApprovedSourceTableIssues(
      dryRun.result.records,
      controlValidation.control.approvedSourceTables,
      issues
    )
  }

  dryRun.result.issues
    .filter(
      (issue) => issue.severity === 'warning' && issue.code !== 'PLAINTEXT_CREDENTIAL_OMITTED'
    )
    .forEach((issue) => {
      issues.push({
        code: 'UNAPPROVED_WARNING',
        path: `$.export.rows.${issue.entity}[${issue.rowIndex}]`,
        message: `${issue.code}: ${issue.message}`,
        entity: issue.entity,
        ...(issue.field ? { field: issue.field } : {}),
      })
    })

  if (
    issues.length > 0 ||
    !controlValidation.control ||
    !observedManifestSha256 ||
    !observedExportSha256
  ) {
    return failed(issues)
  }

  const records = prepareRecords(dryRun.result.records)
  const preparedWithoutDigest: LegacyPreviewPreparedDigestInput = {
    version: 1,
    sourceKey: dryRun.report.sourceKey,
    cutoffAt: controlValidation.control.cutoffAt,
    migrationManifestSha256: observedManifestSha256,
    canonicalExportSha256: observedExportSha256,
    snapshotManifestSha256: controlValidation.control.snapshotManifestSha256,
    extractorVersion: controlValidation.control.extractorVersion,
    transformationPolicyVersion: controlValidation.control.transformationPolicyVersion,
    approvedSourceTables: controlValidation.control.approvedSourceTables,
    reconciliation: dryRun.result.reconciliation,
    records,
  }
  const canonicalDigest = calculateLegacyPreviewPreparedDigest(preparedWithoutDigest)

  return {
    success: true,
    prepared: {
      ...preparedWithoutDigest,
      canonicalDigest,
    },
    issues: [],
  }
}

function appendPointBalanceIssues(
  records: LegacyMigrationRecords,
  issues: LegacyPreviewPreparationIssue[]
): void {
  const historiesByCustomer = new Map<string, LegacyMigrationRecords['pointHistories']>()
  for (const history of records.pointHistories) {
    const customerKey = sourceReferenceKey(history.customer)
    const histories = historiesByCustomer.get(customerKey) ?? []
    histories.push(history)
    historiesByCustomer.set(customerKey, histories)
  }

  records.customers.forEach((customer, rowIndex) => {
    const histories = historiesByCustomer.get(sourceReferenceKey(customer.source)) ?? []
    const latestHistory = histories.reduce<(typeof histories)[number] | null>(
      (latest, history) =>
        latest === null || history.sourceOrder > latest.sourceOrder ? history : latest,
      null
    )

    if (
      (latestHistory === null && customer.points !== 0) ||
      (latestHistory !== null && latestHistory.balance !== customer.points)
    ) {
      issues.push({
        code: 'POINT_BALANCE_MISMATCH',
        path: `$.prepared.records.customers[${rowIndex}].record.points`,
        message: 'Customer balance does not match the latest complete point-history balance.',
        entity: 'customers',
        field: 'points',
      })
    }
  })
}

function appendReservationPointUsageIssues(
  records: LegacyMigrationRecords,
  issues: LegacyPreviewPreparationIssue[]
): void {
  const usedEventsByReservation = new Map<string, LegacyMigrationRecords['pointHistories']>()
  for (const history of records.pointHistories) {
    if (history.type !== 'used' || history.reservation === null) continue
    const reservationKey = sourceReferenceKey(history.reservation)
    const histories = usedEventsByReservation.get(reservationKey) ?? []
    histories.push(history)
    usedEventsByReservation.set(reservationKey, histories)
  }

  records.reservations.forEach((reservation, rowIndex) => {
    const usedEvents = usedEventsByReservation.get(sourceReferenceKey(reservation.source)) ?? []
    const isExactMatch =
      reservation.pointsUsed === 0
        ? usedEvents.length === 0
        : usedEvents.length === 1 && usedEvents[0].amount === -reservation.pointsUsed
    if (isExactMatch) return

    issues.push({
      code: 'POINT_RESERVATION_USAGE_MISMATCH',
      path: `$.prepared.records.reservations[${rowIndex}].record.pointsUsed`,
      message: 'Reservation point usage must match one exact linked negative used event.',
      entity: 'reservations',
      field: 'pointsUsed',
    })
  })
}

function sourceReferenceKey(reference: {
  sourceKey: string
  entity: string
  physicalTable: string
  legacyId: string
}): string {
  return `${reference.sourceKey}\0${reference.entity}\0${reference.physicalTable}\0${reference.legacyId}`
}

function prepareRecords(records: LegacyMigrationRecords): LegacyPreparedRecords {
  return {
    stores: prepareEntityRecords('stores', records.stores),
    courses: prepareEntityRecords('courses', records.courses),
    casts: prepareEntityRecords('casts', records.casts),
    customers: prepareEntityRecords('customers', records.customers),
    reservations: prepareEntityRecords('reservations', records.reservations),
    castSchedules: prepareEntityRecords('castSchedules', records.castSchedules),
    pointHistories: prepareEntityRecords('pointHistories', records.pointHistories),
  }
}

function prepareEntityRecords<Entity extends LegacyEntityName>(
  entity: Entity,
  records: LegacyMigrationRecords[Entity]
): LegacyPreparedRecord<Entity>[] {
  return records.map((record) => ({
    record,
    sourceHash: calculateLegacyPreviewRecordSha256(entity, record),
  })) as LegacyPreparedRecord<Entity>[]
}

function appendPreviewRecordIssues(
  records: LegacyMigrationRecords,
  issues: LegacyPreviewPreparationIssue[]
): void {
  for (const entity of LEGACY_ENTITY_NAMES) {
    records[entity].forEach((record, rowIndex) => {
      const { physicalTable, legacyId } = record.source
      if (
        !isQualifiedLegacyPhysicalTable(physicalTable) ||
        !legacyId.startsWith(`${physicalTable}:`) ||
        legacyId.length === physicalTable.length + 1
      ) {
        issues.push({
          code: 'INVALID_SOURCE_IDENTITY',
          path: `$.prepared.records.${entity}[${rowIndex}].record.source`,
          message:
            'Physical source table must be a safe SQL identifier and must qualify the opaque legacy ID.',
          entity,
        })
      }
    })
  }

  appendRequiredCreatedAtIssues('casts', records.casts, issues)
  appendRequiredCreatedAtIssues('customers', records.customers, issues)
  appendRequiredCreatedAtIssues('reservations', records.reservations, issues)
}

function appendApprovedSourceTableIssues(
  records: LegacyMigrationRecords,
  approvedSourceTables: readonly string[],
  issues: LegacyPreviewPreparationIssue[]
): void {
  const approved = new Set(approvedSourceTables)
  const used = new Set<string>()

  for (const entity of LEGACY_ENTITY_NAMES) {
    records[entity].forEach((record, rowIndex) => {
      const physicalTable = record.source.physicalTable
      used.add(physicalTable)
      if (approved.has(physicalTable)) return
      issues.push({
        code: 'UNAPPROVED_SOURCE_TABLE',
        path: `$.prepared.records.${entity}[${rowIndex}].record.source.physicalTable`,
        message: 'Record source table is absent from the verified snapshot control.',
        entity,
      })
    })
  }

  approvedSourceTables.forEach((physicalTable, index) => {
    if (used.has(physicalTable)) return
    issues.push({
      code: 'UNUSED_APPROVED_SOURCE_TABLE',
      path: `$.control.approvedSourceTables[${index}]`,
      message: 'Approved source table is not used by any accepted canonical record.',
    })
  })
}

function appendRequiredCreatedAtIssues<Entity extends 'casts' | 'customers' | 'reservations'>(
  entity: Entity,
  records: LegacyMigrationRecords[Entity],
  issues: LegacyPreviewPreparationIssue[]
): void {
  records.forEach((record, rowIndex) => {
    if (record.createdAt !== null) return
    issues.push({
      code: 'MISSING_PREVIEW_CREATED_AT',
      path: `$.prepared.records.${entity}[${rowIndex}].record.createdAt`,
      message: `${entity} source-created timestamp is required for preview persistence.`,
      entity,
      field: 'createdAt',
    })
  })
}

function appendRecordAfterCutoffIssues(
  records: LegacyMigrationRecords,
  cutoffAt: string,
  issues: LegacyPreviewPreparationIssue[]
): void {
  const createdAtEntities = [
    'stores',
    'casts',
    'customers',
    'reservations',
    'pointHistories',
  ] as const

  for (const entity of createdAtEntities) {
    records[entity].forEach((record, rowIndex) => {
      if (record.createdAt === null || record.createdAt <= cutoffAt) return
      issues.push({
        code: 'RECORD_AFTER_CUTOFF',
        path: `$.prepared.records.${entity}[${rowIndex}].record.createdAt`,
        message: `${entity} source-created timestamp is later than the approved snapshot cutoff.`,
        entity,
        field: 'createdAt',
      })
    })
  }
}

function validateControl(
  input: unknown,
  now: Date
): {
  control: LegacyPreviewImportControlV1 | null
  issues: LegacyPreviewPreparationIssue[]
} {
  if (!isRecord(input)) {
    return {
      control: null,
      issues: [
        {
          code: 'INVALID_CONTROL',
          path: '$.control',
          message: 'Preview import control must be an object.',
        },
      ],
    }
  }

  const issues: LegacyPreviewPreparationIssue[] = []
  const allowedFields = new Set([
    'version',
    'sourceKey',
    'cutoffAt',
    'migrationManifestSha256',
    'canonicalExportSha256',
    'snapshotManifestSha256',
    'extractorVersion',
    'transformationPolicyVersion',
    'approvedSourceTables',
    'expectedInputCounts',
  ])
  Object.keys(input).forEach((field) => {
    if (!allowedFields.has(field)) {
      issues.push({
        code: 'UNSUPPORTED_CONTROL_FIELD',
        path: `$.control.${field}`,
        message: `${field} is not verified by preview control version 1.`,
      })
    }
  })

  if (input.version !== 1) {
    issues.push({
      code: 'UNSUPPORTED_CONTROL_VERSION',
      path: '$.control.version',
      message: 'Preview import control version must be 1.',
    })
  }

  const sourceKey = typeof input.sourceKey === 'string' ? input.sourceKey.trim() : ''
  if (!sourceKey || sourceKey !== input.sourceKey) {
    issues.push({
      code: 'INVALID_CONTROL',
      path: '$.control.sourceKey',
      message: 'Preview import control sourceKey must be a trimmed non-empty string.',
    })
  }

  const canonicalExportSha256 =
    typeof input.canonicalExportSha256 === 'string' ? input.canonicalExportSha256 : ''
  if (!SHA256_PATTERN.test(canonicalExportSha256)) {
    issues.push({
      code: 'INVALID_SHA256',
      path: '$.control.canonicalExportSha256',
      message: 'Canonical export SHA-256 must be 64 lowercase hexadecimal characters.',
    })
  }

  const migrationManifestSha256 =
    typeof input.migrationManifestSha256 === 'string' ? input.migrationManifestSha256 : ''
  if (!SHA256_PATTERN.test(migrationManifestSha256)) {
    issues.push({
      code: 'INVALID_SHA256',
      path: '$.control.migrationManifestSha256',
      message: 'Migration manifest SHA-256 must be 64 lowercase hexadecimal characters.',
    })
  }

  const snapshotManifestSha256 =
    typeof input.snapshotManifestSha256 === 'string' ? input.snapshotManifestSha256 : ''
  if (!SHA256_PATTERN.test(snapshotManifestSha256)) {
    issues.push({
      code: 'INVALID_SHA256',
      path: '$.control.snapshotManifestSha256',
      message: 'Snapshot manifest SHA-256 must be 64 lowercase hexadecimal characters.',
    })
  }

  const extractorVersion = validateVersionLabel(
    input.extractorVersion,
    '$.control.extractorVersion',
    'Extractor version',
    issues
  )
  const transformationPolicyVersion = validateVersionLabel(
    input.transformationPolicyVersion,
    '$.control.transformationPolicyVersion',
    'Transformation policy version',
    issues
  )
  const approvedSourceTables = validateApprovedSourceTables(input.approvedSourceTables, issues)

  const cutoffAt = typeof input.cutoffAt === 'string' ? input.cutoffAt : ''
  const cutoffDate = new Date(cutoffAt)
  if (
    !CANONICAL_UTC_TIMESTAMP_PATTERN.test(cutoffAt) ||
    Number.isNaN(cutoffDate.getTime()) ||
    cutoffDate.toISOString() !== cutoffAt
  ) {
    issues.push({
      code: 'INVALID_CUTOFF',
      path: '$.control.cutoffAt',
      message: 'Cutoff must be a valid canonical UTC timestamp with milliseconds.',
    })
  } else if (!Number.isNaN(now.getTime()) && cutoffDate.getTime() > now.getTime()) {
    issues.push({
      code: 'FUTURE_CUTOFF',
      path: '$.control.cutoffAt',
      message: 'Cutoff cannot be later than the preparation time.',
    })
  }

  const expectedInputCounts = validateExpectedCounts(input.expectedInputCounts, issues)
  if (issues.length > 0 || !expectedInputCounts || !approvedSourceTables) {
    return { control: null, issues }
  }

  return {
    control: {
      version: 1,
      sourceKey,
      cutoffAt,
      migrationManifestSha256,
      canonicalExportSha256,
      snapshotManifestSha256,
      extractorVersion,
      transformationPolicyVersion,
      approvedSourceTables,
      expectedInputCounts,
    },
    issues: [],
  }
}

function validateExpectedCounts(
  input: unknown,
  issues: LegacyPreviewPreparationIssue[]
): Record<LegacyEntityName, number> | null {
  if (!isRecord(input)) {
    issues.push({
      code: 'INVALID_EXPECTED_COUNT',
      path: '$.control.expectedInputCounts',
      message: 'Expected input counts must be an object containing every canonical entity.',
    })
    return null
  }

  const supportedEntities = new Set<string>(LEGACY_ENTITY_NAMES)
  Object.keys(input).forEach((entity) => {
    if (!supportedEntities.has(entity)) {
      issues.push({
        code: 'INVALID_EXPECTED_COUNT',
        path: `$.control.expectedInputCounts.${entity}`,
        message: `${entity} is not a supported canonical entity count.`,
      })
    }
  })

  for (const entity of LEGACY_ENTITY_NAMES) {
    const count = input[entity]
    if (!Number.isSafeInteger(count) || (count as number) < 0) {
      issues.push({
        code: 'INVALID_EXPECTED_COUNT',
        path: `$.control.expectedInputCounts.${entity}`,
        message: `${entity} count must be a non-negative safe integer.`,
        entity,
      })
    }
  }

  return issues.some((issue) => issue.code === 'INVALID_EXPECTED_COUNT')
    ? null
    : (input as unknown as Record<LegacyEntityName, number>)
}

function validateApprovedSourceTables(
  input: unknown,
  issues: LegacyPreviewPreparationIssue[]
): string[] | null {
  if (!Array.isArray(input) || input.length === 0) {
    issues.push({
      code: 'INVALID_APPROVED_SOURCE_TABLES',
      path: '$.control.approvedSourceTables',
      message: 'Approved source tables must be a non-empty sorted array.',
    })
    return null
  }

  const tables: string[] = []
  input.forEach((candidate, index) => {
    if (!isQualifiedLegacyPhysicalTable(candidate)) {
      issues.push({
        code: 'INVALID_APPROVED_SOURCE_TABLES',
        path: `$.control.approvedSourceTables[${index}]`,
        message: 'Approved source table must be a safe physical SQL identifier.',
      })
      return
    }
    tables.push(candidate)
  })

  const sortedTables = [...tables].sort((left, right) => left.localeCompare(right, 'en'))
  if (
    tables.length !== new Set(tables).size ||
    tables.some((table, index) => table !== sortedTables[index])
  ) {
    issues.push({
      code: 'INVALID_APPROVED_SOURCE_TABLES',
      path: '$.control.approvedSourceTables',
      message: 'Approved source tables must be unique and sorted in ascending order.',
    })
  }

  return issues.some((issue) => issue.code === 'INVALID_APPROVED_SOURCE_TABLES') ? null : tables
}

function validateVersionLabel(
  input: unknown,
  path: string,
  label: string,
  issues: LegacyPreviewPreparationIssue[]
): string {
  const value = typeof input === 'string' ? input : ''
  if (!VERSION_LABEL_PATTERN.test(value)) {
    issues.push({
      code: 'INVALID_CONTROL',
      path,
      message: `${label} must be a trimmed non-empty version label.`,
    })
  }
  return value
}

function validateCapabilities(input: unknown): {
  capabilities: LegacyPreviewPreparationCapabilities | null
  issues: LegacyPreviewPreparationIssue[]
} {
  if (!isRecord(input)) {
    return {
      capabilities: null,
      issues: [
        {
          code: 'INVALID_CAPABILITIES',
          path: '$.capabilities',
          message: 'Preview persistence capabilities must be an object.',
        },
      ],
    }
  }

  const issues: LegacyPreviewPreparationIssue[] = []
  Object.keys(input).forEach((field) => {
    if (field !== 'customerCredential') {
      issues.push({
        code: 'INVALID_CAPABILITIES',
        path: `$.capabilities.${field}`,
        message: `${field} is not a recognized preview persistence capability.`,
      })
    }
  })
  if (
    input.customerCredential !== undefined &&
    input.customerCredential !== 'generated-disabled-password-hash'
  ) {
    issues.push({
      code: 'INVALID_CAPABILITIES',
      path: '$.capabilities.customerCredential',
      message: 'Customer credential capability is not supported.',
    })
  }

  return issues.length > 0
    ? { capabilities: null, issues }
    : {
        capabilities: {
          ...(input.customerCredential === 'generated-disabled-password-hash'
            ? { customerCredential: input.customerCredential }
            : {}),
        },
        issues: [],
      }
}

function isCustomerPasswordBlocker(issue: {
  severity: string
  code: string
  entity: LegacyEntityName
  field?: string
}): boolean {
  return (
    issue.severity === 'error' &&
    issue.code === 'MISSING_TARGET_REQUIRED_FIELD' &&
    issue.entity === 'customers' &&
    issue.field === 'password'
  )
}

function readExportSourceKey(input: unknown): string | null {
  if (!isRecord(input) || typeof input.sourceKey !== 'string') return null
  return input.sourceKey.trim()
}

function stableJson(value: unknown, ancestors: Set<object> = new Set()): string {
  if (value === null) return 'null'
  if (typeof value === 'string' || typeof value === 'boolean') return JSON.stringify(value)
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error('Canonical JSON numbers must be finite.')
    return JSON.stringify(value)
  }
  if (Array.isArray(value)) {
    if (ancestors.has(value)) throw new Error('Canonical JSON cannot contain circular arrays.')
    const nextAncestors = new Set(ancestors).add(value)
    return `[${value.map((item) => stableJson(item, nextAncestors)).join(',')}]`
  }
  if (!isRecord(value)) throw new Error('Canonical JSON contains an unsupported value.')
  if (ancestors.has(value)) throw new Error('Canonical JSON cannot contain circular objects.')

  const nextAncestors = new Set(ancestors).add(value)
  const entries = Object.keys(value)
    .sort((left, right) => left.localeCompare(right, 'en'))
    .map((key) => `${JSON.stringify(key)}:${stableJson(value[key], nextAncestors)}`)
  return `{${entries.join(',')}}`
}

function sha256(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex')
}

function failed(issues: LegacyPreviewPreparationIssue[]): LegacyPreviewPreparationResult {
  return { success: false, prepared: null, issues }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
