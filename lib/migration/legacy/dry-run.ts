/**
 * @design_doc   docs/LEGACY_DATA_MIGRATION_RUNBOOK.md staging dry-run gate
 * @related_to   manifest.ts validates mappings; transform.ts builds secure intermediate records
 * @known_issues Persistence remains blocked until every target-required field has a safe value
 */
import { validateLegacyMigrationManifest } from './manifest'
import { findUnsupportedLegacyColumns } from './columns'
import { transformLegacyExport } from './transform'
import {
  LEGACY_ENTITY_NAMES,
  type LegacyEntityName,
  type LegacyMigrationIssue,
  type LegacyMigrationReconciliation,
  type LegacyMigrationResult,
  type LegacyOfflineExport,
} from './types'

export interface LegacyDryRunInputIssue {
  code:
    | 'INVALID_MANIFEST'
    | 'INVALID_EXPORT'
    | 'INVALID_EXPORT_ROWS'
    | 'INVALID_EXPORT_ROW'
    | 'UNSUPPORTED_EXPORT_COLUMN'
    | 'UNSUPPORTED_EXPORT_ENTITY'
    | 'UNSUPPORTED_EXPORT_FIELD'
  path: string
  message: string
}

export interface LegacyDryRunReportIssue {
  severity: LegacyMigrationIssue['severity']
  code: LegacyMigrationIssue['code']
  message: string
  entity: LegacyMigrationIssue['entity']
  rowIndex: number
  field?: string
}

export interface LegacyDryRunReport {
  sourceKey: string
  readyForPersistence: boolean
  persistenceAdapterReady: boolean
  errorCount: number
  warningCount: number
  blockedCustomerCount: number
  deferredCourseReferenceCount: number
  targetSchemaBlockerCount: number
  reconciliation: LegacyMigrationReconciliation
  issues: LegacyDryRunReportIssue[]
}

const PERSISTENCE_ADAPTER_READY = false

export interface LegacyDryRunExecution {
  transformed: boolean
  readyForPersistence: boolean
  inputIssues: LegacyDryRunInputIssue[]
  result: LegacyMigrationResult | null
  report: LegacyDryRunReport | null
}

export function runLegacyMigrationDryRun(
  manifestInput: unknown,
  exportInput: unknown
): LegacyDryRunExecution {
  const manifestValidation = validateLegacyMigrationManifest(manifestInput)
  if (!manifestValidation.success) {
    return failedInput(
      manifestValidation.issues.map((manifestIssue) => ({
        code: 'INVALID_MANIFEST',
        path: sanitizeManifestIssuePath(manifestIssue.code, manifestIssue.path),
        message: `${manifestIssue.code}: ${manifestIssue.message}`,
      }))
    )
  }

  const exportValidation = validateOfflineExport(exportInput)
  if (!exportValidation.success) {
    return failedInput(exportValidation.issues)
  }

  let result: LegacyMigrationResult
  try {
    result = transformLegacyExport(manifestValidation.data, exportValidation.data)
  } catch {
    return failedInput([
      {
        code: 'INVALID_EXPORT',
        path: '$.sourceKey',
        message: 'Legacy export could not be transformed.',
      },
    ])
  }

  const targetSchemaIssues = collectTargetSchemaIssues(exportValidation.data, result)
  result = {
    ...result,
    issues: [...result.issues, ...targetSchemaIssues],
  }

  const errorCount = result.issues.filter((issue) => issue.severity === 'error').length
  const warningCount = result.issues.length - errorCount
  const blockedCustomerIds = new Set(
    result.records.customers
      .filter((customer) => customer.persistenceDisposition !== 'ready')
      .map((customer) => customer.source.legacyId)
  )
  targetSchemaIssues.forEach((issue) => {
    if (issue.entity === 'customers' && issue.legacyId !== null) {
      blockedCustomerIds.add(issue.legacyId)
    }
  })
  const blockedCustomerCount = blockedCustomerIds.size
  const deferredCourseReferenceCount = result.issues.filter(
    (issue) =>
      issue.entity === 'reservations' &&
      issue.code === 'UNRESOLVED_REFERENCE' &&
      issue.field === 'course_id'
  ).length
  const targetSchemaBlockerCount = targetSchemaIssues.length
  const readyForPersistence =
    PERSISTENCE_ADAPTER_READY &&
    errorCount === 0 &&
    blockedCustomerCount === 0 &&
    deferredCourseReferenceCount === 0 &&
    targetSchemaBlockerCount === 0

  const report: LegacyDryRunReport = {
    sourceKey: exportValidation.data.sourceKey,
    readyForPersistence,
    persistenceAdapterReady: PERSISTENCE_ADAPTER_READY,
    errorCount,
    warningCount,
    blockedCustomerCount,
    deferredCourseReferenceCount,
    targetSchemaBlockerCount,
    reconciliation: result.reconciliation,
    issues: result.issues.map(({ legacyId: _legacyId, ...issue }) => issue),
  }

  return {
    transformed: true,
    readyForPersistence,
    inputIssues: [],
    result,
    report,
  }
}

function validateOfflineExport(
  input: unknown
):
  | { success: true; data: LegacyOfflineExport }
  | { success: false; issues: LegacyDryRunInputIssue[] } {
  if (!isRecord(input)) {
    return {
      success: false,
      issues: [{ code: 'INVALID_EXPORT', path: '$', message: 'Export must be an object.' }],
    }
  }

  const issues: LegacyDryRunInputIssue[] = []
  for (const field of Object.keys(input)) {
    if (field !== 'sourceKey' && field !== 'rows') {
      issues.push({
        code: 'UNSUPPORTED_EXPORT_FIELD',
        path: '$',
        message: 'Export contains an unsupported top-level field.',
      })
    }
  }
  const sourceKey = typeof input.sourceKey === 'string' ? input.sourceKey.trim() : ''
  if (!sourceKey) {
    issues.push({
      code: 'INVALID_EXPORT',
      path: '$.sourceKey',
      message: 'Export sourceKey must be a non-empty string.',
    })
  }

  if (!isRecord(input.rows)) {
    issues.push({
      code: 'INVALID_EXPORT',
      path: '$.rows',
      message: 'Export rows must be an object.',
    })
    return { success: false, issues }
  }

  const supportedEntities = new Set<string>(LEGACY_ENTITY_NAMES)
  for (const entity of Object.keys(input.rows)) {
    if (!supportedEntities.has(entity)) {
      issues.push({
        code: 'UNSUPPORTED_EXPORT_ENTITY',
        path: '$.rows',
        message: 'Export rows contain an unsupported entity.',
      })
    }
  }

  for (const entity of LEGACY_ENTITY_NAMES) {
    const rows = input.rows[entity]
    if (!Array.isArray(rows)) {
      issues.push({
        code: 'INVALID_EXPORT_ROWS',
        path: `$.rows.${entity}`,
        message: `${entity} must be an array.`,
      })
      continue
    }

    rows.forEach((row, rowIndex) => {
      if (!isRecord(row)) {
        issues.push({
          code: 'INVALID_EXPORT_ROW',
          path: `$.rows.${entity}[${rowIndex}]`,
          message: `${entity} rows must be objects.`,
        })
        return
      }

      for (const column of findUnsupportedLegacyColumns(entity, row)) {
        issues.push({
          code: 'UNSUPPORTED_EXPORT_COLUMN',
          path: `$.rows.${entity}[${rowIndex}]`,
          message: `${entity} row contains an unsupported canonical column.`,
        })
      }
    })
  }

  if (issues.length > 0) {
    return { success: false, issues }
  }

  return {
    success: true,
    data: {
      sourceKey,
      rows: {
        stores: input.rows.stores as LegacyOfflineExport['rows']['stores'],
        courses: input.rows.courses as LegacyOfflineExport['rows']['courses'],
        casts: input.rows.casts as LegacyOfflineExport['rows']['casts'],
        customers: input.rows.customers as LegacyOfflineExport['rows']['customers'],
        reservations: input.rows.reservations as LegacyOfflineExport['rows']['reservations'],
        castSchedules: input.rows.castSchedules as LegacyOfflineExport['rows']['castSchedules'],
        pointHistories: input.rows.pointHistories as LegacyOfflineExport['rows']['pointHistories'],
      },
    },
  }
}

function sanitizeManifestIssuePath(code: string, path: string): string {
  if (code !== 'UNSUPPORTED_MANIFEST_FIELD') return path
  const mappingPath = /^\$\.sources\[\d+\]\.storeMappings\[\d+\]/u.exec(path)?.[0]
  if (mappingPath) return mappingPath
  const sourcePath = /^\$\.sources\[\d+\]/u.exec(path)?.[0]
  return sourcePath ?? '$'
}

function collectTargetSchemaIssues(
  offlineExport: LegacyOfflineExport,
  result: LegacyMigrationResult
): LegacyMigrationIssue[] {
  const issues: LegacyMigrationIssue[] = []
  const castRowIndexes = indexRowsByLegacyId(offlineExport.rows.casts)
  const customerRowIndexes = indexRowsByLegacyId(offlineExport.rows.customers)

  result.records.casts.forEach((cast) => {
    const requiredFields: ReadonlyArray<readonly [string, unknown]> = [
      ['age', cast.age],
      ['height', cast.height],
      ['bust', cast.bust],
      ['waist', cast.waist],
      ['hip', cast.hip],
      ['type', cast.type],
      ['image', cast.image],
      ['description', cast.description],
      ['panelDesignationRank', cast.panelDesignationRank],
      ['regularDesignationRank', cast.regularDesignationRank],
    ]
    appendMissingTargetFields(
      issues,
      'casts',
      cast.source.legacyId,
      castRowIndexes.get(cast.source.legacyId) ?? -1,
      requiredFields
    )
  })

  result.records.customers.forEach((customer) => {
    const requiredFields: ReadonlyArray<readonly [string, unknown]> = [
      ['nameKana', customer.nameKana],
      ['email', customer.email],
      ['password', undefined],
      ['birthDate', customer.birthDate],
    ]
    appendMissingTargetFields(
      issues,
      'customers',
      customer.source.legacyId,
      customerRowIndexes.get(customer.source.legacyId) ?? -1,
      requiredFields
    )
  })

  return issues
}

function appendMissingTargetFields(
  issues: LegacyMigrationIssue[],
  entity: 'casts' | 'customers',
  legacyId: string,
  rowIndex: number,
  requiredFields: ReadonlyArray<readonly [string, unknown]>
): void {
  requiredFields.forEach(([field, value]) => {
    if (!isMissingTargetValue(value)) return
    issues.push({
      severity: 'error',
      code: 'MISSING_TARGET_REQUIRED_FIELD',
      message: `Target Prisma field ${field} is required but has no migration-safe value.`,
      entity,
      rowIndex,
      legacyId,
      field,
    })
  })
}

function indexRowsByLegacyId(
  rows: LegacyOfflineExport['rows'][LegacyEntityName]
): Map<string, number> {
  const indexes = new Map<string, number>()
  rows.forEach((row, rowIndex) => {
    const legacyId = normalizeLegacyId(row.id)
    if (legacyId !== null && !indexes.has(legacyId)) indexes.set(legacyId, rowIndex)
  })
  return indexes
}

function normalizeLegacyId(value: unknown): string | null {
  if (typeof value === 'string') {
    const normalized = value.normalize('NFKC').trim()
    return normalized === '' ? null : normalized
  }
  return typeof value === 'number' && Number.isSafeInteger(value) ? String(value) : null
}

function isMissingTargetValue(value: unknown): boolean {
  return value === null || value === undefined || (typeof value === 'string' && value.trim() === '')
}

function failedInput(inputIssues: LegacyDryRunInputIssue[]): LegacyDryRunExecution {
  return {
    transformed: false,
    readyForPersistence: false,
    inputIssues,
    result: null,
    report: null,
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
