/**
 * @design_doc   docs/LEGACY_DATA_MIGRATION_RUNBOOK.md disposable preview target gate
 * @related_to   Preview persistence checks this pure guard before opening a write transaction
 * @known_issues The database marker must be provisioned independently on the isolated preview DB
 */

export const LEGACY_PREVIEW_ACKNOWLEDGEMENT =
  'IMPORT_DISPOSABLE_LEGACY_SNAPSHOT_INTO_ISOLATED_PREVIEW'

export interface LegacyPreviewSafetyInput {
  runtimeMode: string | undefined
  outboundDeliveryMode: string | undefined
  databaseUrl: string | undefined
  expectedDatabaseName: string | undefined
  configuredMarker: string | undefined
  databaseMarker: string | null | undefined
  confirmedMarker: string | undefined
  databaseEnvironment: string | null | undefined
  acknowledgement: string | undefined
}

export interface LegacyPreviewTarget {
  databaseName: string
  marker: string
}

export function assertLegacyPreviewTarget(input: LegacyPreviewSafetyInput): LegacyPreviewTarget {
  if (input.runtimeMode !== 'preview') {
    fail('APP_RUNTIME_MODE must be preview.')
  }
  if (input.outboundDeliveryMode !== 'disabled') {
    fail('OUTBOUND_DELIVERY_MODE must be disabled.')
  }
  if (input.acknowledgement !== LEGACY_PREVIEW_ACKNOWLEDGEMENT) {
    fail('The one-time acknowledgement does not match.')
  }

  const expectedDatabaseName = input.expectedDatabaseName?.trim() ?? ''
  if (!/^[a-z0-9][a-z0-9_-]*_preview$/u.test(expectedDatabaseName)) {
    fail('The approved database name must end in _preview.')
  }

  const databaseName = parseDatabaseName(input.databaseUrl)
  if (databaseName !== expectedDatabaseName) {
    fail('The connection URL does not select the approved preview database.')
  }

  const configuredMarker = normalizeMarker(input.configuredMarker)
  const databaseMarker = normalizeMarker(input.databaseMarker)
  const confirmedMarker = normalizeMarker(input.confirmedMarker)
  if (
    !configuredMarker ||
    !databaseMarker ||
    !confirmedMarker ||
    configuredMarker !== databaseMarker ||
    configuredMarker !== confirmedMarker
  ) {
    fail('The isolated database marker does not match.')
  }
  if (input.databaseEnvironment !== 'staging-preview') {
    fail('The database does not identify itself as staging-preview.')
  }

  return { databaseName, marker: configuredMarker }
}

function parseDatabaseName(value: string | undefined): string {
  try {
    const parsed = new URL(value ?? '')
    if (
      (parsed.protocol !== 'postgresql:' && parsed.protocol !== 'postgres:') ||
      parsed.hostname.length === 0 ||
      parsed.hash.length > 0 ||
      !hasSafeConnectionParameters(parsed)
    ) {
      fail('The target must be a PostgreSQL database URL.')
    }

    const pathname = decodeURIComponent(parsed.pathname)
    if (!/^\/[a-z0-9][a-z0-9_-]*_preview$/u.test(pathname)) {
      fail('The URL must select one explicit preview database.')
    }
    return pathname.slice(1)
  } catch (error) {
    if (error instanceof LegacyPreviewSafetyError) throw error
    fail('The target database URL is invalid.')
  }
}

function hasSafeConnectionParameters(parsed: URL): boolean {
  if (parsed.searchParams.size === 0) return true
  const schemaValues = parsed.searchParams.getAll('schema')
  return parsed.searchParams.size === 1 && schemaValues.length === 1 && schemaValues[0] === 'public'
}

function normalizeMarker(value: string | null | undefined): string | null {
  const normalized = value?.trim() ?? ''
  return /^[A-Za-z0-9][A-Za-z0-9_-]{19,127}$/u.test(normalized) ? normalized : null
}

class LegacyPreviewSafetyError extends Error {}

function fail(reason: string): never {
  throw new LegacyPreviewSafetyError(`[legacy preview safety] ${reason}`)
}
