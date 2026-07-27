/**
 * @design_doc   Legacy migration manifest v1, defined in types.ts
 * @related_to   transform.ts consumes only manifests accepted by this validator
 * @known_issues Version 1 uses a fixed UTC offset per source rather than timezone rule history
 */

import type {
  LegacyManifestIssue,
  LegacyManifestValidationResult,
  LegacyMigrationManifestV1,
  LegacySourceManifestV1,
  LegacyStoreMapping,
} from './types'

const MIN_UTC_OFFSET_MINUTES = -14 * 60
const MAX_UTC_OFFSET_MINUTES = 14 * 60
const MANIFEST_FIELDS = new Set(['version', 'sources'])
const SOURCE_FIELDS = new Set(['sourceKey', 'utcOffsetMinutes', 'storeMappings'])
const STORE_MAPPING_FIELDS = new Set([
  'legacyStoreId',
  'targetStoreId',
  'targetStoreSlug',
  'targetStoreTimezone',
])
const TARGET_STORE_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u
const MAX_TARGET_STORE_SLUG_LENGTH = 100

export function validateLegacyMigrationManifest(input: unknown): LegacyManifestValidationResult {
  const issues: LegacyManifestIssue[] = []

  if (!isRecord(input)) {
    return failure([issue('INVALID_MANIFEST', '$', 'Manifest must be an object.')])
  }

  appendUnsupportedFields(input, MANIFEST_FIELDS, '$', issues)

  if (input.version !== 1) {
    issues.push(
      issue(
        'UNSUPPORTED_VERSION',
        '$.version',
        'Only legacy migration manifest version 1 is supported.'
      )
    )
  }

  if (!Array.isArray(input.sources)) {
    issues.push(issue('INVALID_MANIFEST', '$.sources', 'Sources must be an array.'))
    return failure(issues)
  }

  if (input.sources.length === 0) {
    issues.push(issue('EMPTY_SOURCES', '$.sources', 'At least one legacy source is required.'))
  }

  const sourceKeys = new Set<string>()
  const sources: LegacySourceManifestV1[] = []

  input.sources.forEach((sourceInput, sourceIndex) => {
    const path = `$.sources[${sourceIndex}]`
    if (!isRecord(sourceInput)) {
      issues.push(issue('INVALID_MANIFEST', path, 'Each source must be an object.'))
      return
    }
    appendUnsupportedFields(sourceInput, SOURCE_FIELDS, path, issues)

    const sourceKey = nonEmptyString(sourceInput.sourceKey)
    if (sourceKey === null) {
      issues.push(
        issue('INVALID_SOURCE_KEY', `${path}.sourceKey`, 'Source key must be a non-empty string.')
      )
    } else if (sourceKeys.has(sourceKey)) {
      issues.push(issue('DUPLICATE_SOURCE_KEY', `${path}.sourceKey`, 'Source keys must be unique.'))
    } else {
      sourceKeys.add(sourceKey)
    }

    const utcOffsetMinutes = sourceInput.utcOffsetMinutes
    if (
      !Number.isInteger(utcOffsetMinutes) ||
      (utcOffsetMinutes as number) < MIN_UTC_OFFSET_MINUTES ||
      (utcOffsetMinutes as number) > MAX_UTC_OFFSET_MINUTES
    ) {
      issues.push(
        issue(
          'INVALID_UTC_OFFSET',
          `${path}.utcOffsetMinutes`,
          'UTC offset must be an integer from -840 through 840 minutes.'
        )
      )
    }

    if (!Array.isArray(sourceInput.storeMappings)) {
      issues.push(
        issue('INVALID_MANIFEST', `${path}.storeMappings`, 'Store mappings must be an array.')
      )
      return
    }

    if (sourceInput.storeMappings.length === 0) {
      issues.push(
        issue(
          'EMPTY_STORE_MAPPINGS',
          `${path}.storeMappings`,
          'Each source must map at least one legacy store.'
        )
      )
    }

    const legacyStoreIds = new Set<string>()
    const targetStoreIds = new Set<string>()
    const targetStoreSlugs = new Set<string>()
    const storeMappings: LegacyStoreMapping[] = []

    sourceInput.storeMappings.forEach((mappingInput, mappingIndex) => {
      const mappingPath = `${path}.storeMappings[${mappingIndex}]`
      if (!isRecord(mappingInput)) {
        issues.push(
          issue('INVALID_STORE_MAPPING', mappingPath, 'Each store mapping must be an object.')
        )
        return
      }
      appendUnsupportedFields(mappingInput, STORE_MAPPING_FIELDS, mappingPath, issues)

      const legacyStoreId = nonEmptyString(mappingInput.legacyStoreId)
      const targetStoreId = nonEmptyString(mappingInput.targetStoreId)
      const targetStoreSlug = canonicalStoreSlug(mappingInput.targetStoreSlug)
      const targetStoreTimezone =
        mappingInput.targetStoreTimezone === 'Asia/Tokyo' ? 'Asia/Tokyo' : null
      if (
        legacyStoreId === null ||
        targetStoreId === null ||
        targetStoreSlug === null ||
        targetStoreTimezone === null
      ) {
        issues.push(
          issue(
            'INVALID_STORE_MAPPING',
            mappingPath,
            'Store mappings require non-empty IDs, a canonical lowercase target slug, and target timezone Asia/Tokyo.'
          )
        )
        return
      }

      if (legacyStoreIds.has(legacyStoreId)) {
        issues.push(
          issue(
            'DUPLICATE_STORE_MAPPING',
            `${mappingPath}.legacyStoreId`,
            'A legacy store may only be mapped once per source.'
          )
        )
      } else {
        legacyStoreIds.add(legacyStoreId)
      }

      if (targetStoreIds.has(targetStoreId)) {
        issues.push(
          issue(
            'DUPLICATE_TARGET_STORE_MAPPING',
            `${mappingPath}.targetStoreId`,
            'A target store may only be mapped once per source.'
          )
        )
      } else {
        targetStoreIds.add(targetStoreId)
      }

      if (targetStoreSlugs.has(targetStoreSlug)) {
        issues.push(
          issue(
            'DUPLICATE_TARGET_STORE_MAPPING',
            `${mappingPath}.targetStoreSlug`,
            'A target store slug may only be mapped once per source.'
          )
        )
      } else {
        targetStoreSlugs.add(targetStoreSlug)
      }

      storeMappings.push({
        legacyStoreId,
        targetStoreId,
        targetStoreSlug,
        targetStoreTimezone,
      })
    })

    if (
      sourceKey !== null &&
      Number.isInteger(utcOffsetMinutes) &&
      (utcOffsetMinutes as number) >= MIN_UTC_OFFSET_MINUTES &&
      (utcOffsetMinutes as number) <= MAX_UTC_OFFSET_MINUTES
    ) {
      sources.push({
        sourceKey,
        utcOffsetMinutes: utcOffsetMinutes as number,
        storeMappings,
      })
    }
  })

  if (issues.length > 0) {
    return failure(issues)
  }

  return {
    success: true,
    data: {
      version: 1,
      sources,
    },
    issues: [],
  }
}

function failure(
  issues: LegacyManifestIssue[]
): Extract<LegacyManifestValidationResult, { success: false }> {
  return { success: false, issues }
}

function issue(
  code: LegacyManifestIssue['code'],
  path: string,
  message: string
): LegacyManifestIssue {
  return { code, path, message }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function nonEmptyString(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const normalized = value.trim()
  return normalized === '' ? null : normalized
}

function canonicalStoreSlug(value: unknown): string | null {
  if (
    typeof value !== 'string' ||
    value.length > MAX_TARGET_STORE_SLUG_LENGTH ||
    !TARGET_STORE_SLUG_PATTERN.test(value)
  ) {
    return null
  }
  return value
}

function appendUnsupportedFields(
  value: Record<string, unknown>,
  supportedFields: ReadonlySet<string>,
  path: string,
  issues: LegacyManifestIssue[]
): void {
  for (const field of Object.keys(value)) {
    if (supportedFields.has(field)) continue
    issues.push(
      issue(
        'UNSUPPORTED_MANIFEST_FIELD',
        `${path}.${field}`,
        'Manifest contains a field that is not verified by version 1.'
      )
    )
  }
}

export function assertLegacyMigrationManifest(
  input: LegacyMigrationManifestV1
): LegacyMigrationManifestV1 {
  const result = validateLegacyMigrationManifest(input)
  if (!result.success) {
    const summary = result.issues
      .map((manifestIssue) => `${manifestIssue.path}: ${manifestIssue.message}`)
      .join('; ')
    throw new Error(`Invalid legacy migration manifest: ${summary}`)
  }
  return result.data
}
