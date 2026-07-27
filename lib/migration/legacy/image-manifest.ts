/**
 * @design_doc   docs/LEGACY_DATA_MIGRATION_RUNBOOK.md offline preview image verification
 * @related_to   preview-image-import.ts binds explicit owners; preview-image-filesystem.ts verifies bytes
 * @known_issues Version 1 deliberately rejects private assets and supports JPEG, PNG, and WebP only
 */

export interface LegacyPublicImageManifestEntry {
  sourcePath: string
  targetPath: string
  owner: LegacyPublicImageOwner
  slot: number
  mediaType: LegacyPublicImageMediaType
  width: number
  height: number
  sha256: string
  sizeBytes: number
  visibility: 'public'
}

export interface LegacyPublicImageOwner {
  sourceKey: string
  entity: 'casts'
  physicalTable: string
  legacyId: string
}

export type LegacyPublicImageMediaType = 'image/jpeg' | 'image/png' | 'image/webp'

export interface LegacyImageManifestV1 {
  version: 1
  sourceKey: string
  capturedAt: string
  files: LegacyPublicImageManifestEntry[]
}

export interface LegacyImageManifestIssue {
  code:
    | 'DUPLICATE_SOURCE_PATH'
    | 'DUPLICATE_TARGET_PATH'
    | 'DUPLICATE_OWNER_SLOT'
    | 'FILE_NOT_REGULAR'
    | 'FILE_UNREADABLE'
    | 'INVALID_CAPTURED_AT'
    | 'INVALID_DIGEST'
    | 'INVALID_MANIFEST'
    | 'INVALID_MEDIA_DIMENSION'
    | 'INVALID_MEDIA_TYPE'
    | 'INVALID_OWNER'
    | 'INVALID_PATH'
    | 'INVALID_SIZE'
    | 'INVALID_SLOT'
    | 'SOURCE_KEY_MISMATCH'
    | 'SYMLINK_FORBIDDEN'
    | 'UNSUPPORTED_FIELD'
    | 'UNSUPPORTED_VERSION'
    | 'UNSUPPORTED_VISIBILITY'
    | 'VERIFICATION_MISMATCH'
  path: string
  message: string
}

export type LegacyImageManifestValidation =
  | { success: true; data: LegacyImageManifestV1; issues: [] }
  | { success: false; issues: LegacyImageManifestIssue[] }

export interface LegacyImageInspection {
  isFile: boolean
  isSymbolicLink: boolean
  sizeBytes: number
  sha256: string
  mediaType: LegacyPublicImageMediaType | null
  width: number | null
  height: number | null
}

export interface LegacyImageSnapshotIo {
  inspectFile: (sourcePath: string) => Promise<LegacyImageInspection>
}

export interface LegacyImageVerificationResult {
  success: boolean
  verifiedFileCount: number
  verifiedByteCount: number
  issues: LegacyImageManifestIssue[]
}

const TOP_LEVEL_FIELDS = new Set(['version', 'sourceKey', 'capturedAt', 'files'])
const FILE_FIELDS = new Set([
  'sourcePath',
  'targetPath',
  'owner',
  'slot',
  'mediaType',
  'width',
  'height',
  'sha256',
  'sizeBytes',
  'visibility',
])
const OWNER_FIELDS = new Set(['sourceKey', 'entity', 'physicalTable', 'legacyId'])
const SHA256_PATTERN = /^[a-f0-9]{64}$/u
const QUALIFIED_PHYSICAL_TABLE_PATTERN =
  /^[A-Za-z_][A-Za-z0-9_$]*\.[A-Za-z_][A-Za-z0-9_$]*(?:\.[A-Za-z_][A-Za-z0-9_$]*)*$/u
const CANONICAL_TARGET_SEGMENT_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._~-]*$/u
const MEDIA_TYPES = new Set<LegacyPublicImageMediaType>(['image/jpeg', 'image/png', 'image/webp'])

export function validateLegacyImageManifest(
  input: unknown,
  expectedSourceKey: string
): LegacyImageManifestValidation {
  if (!isRecord(input)) {
    return failure('INVALID_MANIFEST', '$', 'Image manifest must be an object.')
  }

  const issues: LegacyImageManifestIssue[] = []
  appendUnknownFields(input, TOP_LEVEL_FIELDS, '$', issues)

  if (input.version !== 1) {
    issues.push({
      code: 'UNSUPPORTED_VERSION',
      path: '$.version',
      message: 'Image manifest version must be 1.',
    })
  }

  const sourceKey = normalizeNonEmptyString(input.sourceKey)
  if (!sourceKey || sourceKey !== expectedSourceKey.trim()) {
    issues.push({
      code: 'SOURCE_KEY_MISMATCH',
      path: '$.sourceKey',
      message: 'Image manifest sourceKey does not match the approved source.',
    })
  }

  const capturedAt = normalizeIsoDateTime(input.capturedAt)
  if (!capturedAt) {
    issues.push({
      code: 'INVALID_CAPTURED_AT',
      path: '$.capturedAt',
      message: 'capturedAt must be an exact UTC ISO-8601 timestamp.',
    })
  }

  if (!Array.isArray(input.files)) {
    issues.push({
      code: 'INVALID_MANIFEST',
      path: '$.files',
      message: 'Image manifest files must be an array.',
    })
    return { success: false, issues }
  }

  const files: LegacyPublicImageManifestEntry[] = []
  const sourcePaths = new Set<string>()
  const targetPaths = new Set<string>()
  const ownerSlots = new Set<string>()

  input.files.forEach((candidate, index) => {
    const path = `$.files[${index}]`
    if (!isRecord(candidate)) {
      issues.push({ code: 'INVALID_MANIFEST', path, message: 'Image entry must be an object.' })
      return
    }

    const issueCountBefore = issues.length
    appendUnknownFields(candidate, FILE_FIELDS, path, issues)
    const sourcePath = validateRelativePath(candidate.sourcePath, `${path}.sourcePath`, issues)
    const targetPath = validateRelativePath(candidate.targetPath, `${path}.targetPath`, issues)
    if (targetPath && !targetPath.startsWith('casts/')) {
      issues.push({
        code: 'INVALID_PATH',
        path: `${path}.targetPath`,
        message: 'Version 1 image targets must be inside casts/.',
      })
    }
    if (
      targetPath &&
      targetPath.split('/').some((segment) => !CANONICAL_TARGET_SEGMENT_PATTERN.test(segment))
    ) {
      issues.push({
        code: 'INVALID_PATH',
        path: `${path}.targetPath`,
        message: 'Image target paths must be canonical URL-safe path segments.',
      })
    }

    const owner = validateOwner(candidate.owner, sourceKey, `${path}.owner`, issues)
    const slot = candidate.slot
    if (!Number.isSafeInteger(slot) || (slot as number) < 1 || (slot as number) > 15) {
      issues.push({
        code: 'INVALID_SLOT',
        path: `${path}.slot`,
        message: 'Image slot must be an integer from 1 through 15.',
      })
    }

    const mediaType =
      typeof candidate.mediaType === 'string' &&
      MEDIA_TYPES.has(candidate.mediaType as LegacyPublicImageMediaType)
        ? (candidate.mediaType as LegacyPublicImageMediaType)
        : null
    if (!mediaType) {
      issues.push({
        code: 'INVALID_MEDIA_TYPE',
        path: `${path}.mediaType`,
        message: 'Image media type must be an approved raster type.',
      })
    } else if (targetPath && !hasExpectedExtension(targetPath, mediaType)) {
      issues.push({
        code: 'INVALID_MEDIA_TYPE',
        path: `${path}.mediaType`,
        message: 'Image target extension must match its approved media type.',
      })
    }

    const width = validateDimension(candidate.width, `${path}.width`, issues)
    const height = validateDimension(candidate.height, `${path}.height`, issues)

    const sha256 = typeof candidate.sha256 === 'string' ? candidate.sha256 : ''
    if (!SHA256_PATTERN.test(sha256)) {
      issues.push({
        code: 'INVALID_DIGEST',
        path: `${path}.sha256`,
        message: 'Image checksum must be a lowercase SHA-256 digest.',
      })
    }

    const sizeBytes = candidate.sizeBytes
    if (!Number.isSafeInteger(sizeBytes) || (sizeBytes as number) < 0) {
      issues.push({
        code: 'INVALID_SIZE',
        path: `${path}.sizeBytes`,
        message: 'Image size must be a non-negative safe integer.',
      })
    }

    if (candidate.visibility !== 'public') {
      issues.push({
        code: 'UNSUPPORTED_VISIBILITY',
        path: `${path}.visibility`,
        message: 'Version 1 supports public images only.',
      })
    }

    if (sourcePath) {
      if (sourcePaths.has(sourcePath)) {
        issues.push({
          code: 'DUPLICATE_SOURCE_PATH',
          path: `${path}.sourcePath`,
          message: 'Each source image path must be unique.',
        })
      }
      sourcePaths.add(sourcePath)
    }
    if (targetPath) {
      if (targetPaths.has(targetPath)) {
        issues.push({
          code: 'DUPLICATE_TARGET_PATH',
          path: `${path}.targetPath`,
          message: 'Each target image path must be unique.',
        })
      }
      targetPaths.add(targetPath)
    }
    if (owner && Number.isSafeInteger(slot) && (slot as number) >= 1 && (slot as number) <= 15) {
      const ownerSlot = `${owner.sourceKey}\0${owner.physicalTable}\0${owner.legacyId}\0${slot}`
      if (ownerSlots.has(ownerSlot)) {
        issues.push({
          code: 'DUPLICATE_OWNER_SLOT',
          path: `${path}.slot`,
          message: 'Each cast owner and image slot combination must be unique.',
        })
      }
      ownerSlots.add(ownerSlot)
    }

    if (
      issues.length === issueCountBefore &&
      sourcePath &&
      targetPath &&
      owner &&
      Number.isSafeInteger(slot) &&
      (slot as number) >= 1 &&
      (slot as number) <= 15 &&
      mediaType &&
      width &&
      height &&
      SHA256_PATTERN.test(sha256) &&
      Number.isSafeInteger(sizeBytes) &&
      (sizeBytes as number) >= 0 &&
      candidate.visibility === 'public'
    ) {
      files.push({
        sourcePath,
        targetPath,
        owner,
        slot: slot as number,
        mediaType,
        width,
        height,
        sha256,
        sizeBytes: sizeBytes as number,
        visibility: 'public',
      })
    }
  })

  if (issues.length > 0 || !sourceKey || !capturedAt) {
    return { success: false, issues }
  }

  return {
    success: true,
    data: { version: 1, sourceKey, capturedAt, files },
    issues: [],
  }
}

export async function verifyLegacyImageSnapshot(
  input: unknown,
  expectedSourceKey: string,
  io: LegacyImageSnapshotIo
): Promise<LegacyImageVerificationResult> {
  const validation = validateLegacyImageManifest(input, expectedSourceKey)
  if (!validation.success) {
    return { success: false, verifiedFileCount: 0, verifiedByteCount: 0, issues: validation.issues }
  }

  const issues: LegacyImageManifestIssue[] = []
  let verifiedByteCount = 0
  for (const [index, file] of validation.data.files.entries()) {
    let inspection: LegacyImageInspection
    try {
      inspection = await io.inspectFile(file.sourcePath)
    } catch {
      issues.push({
        code: 'FILE_UNREADABLE',
        path: `$.files[${index}]`,
        message: 'Image file could not be inspected.',
      })
      continue
    }

    if (inspection.isSymbolicLink) {
      issues.push({
        code: 'SYMLINK_FORBIDDEN',
        path: `$.files[${index}]`,
        message: 'Symbolic links are forbidden in image snapshots.',
      })
      continue
    }
    if (!inspection.isFile) {
      issues.push({
        code: 'FILE_NOT_REGULAR',
        path: `$.files[${index}]`,
        message: 'Image snapshot entry must resolve to a regular file.',
      })
      continue
    }
    if (
      inspection.sizeBytes !== file.sizeBytes ||
      inspection.sha256 !== file.sha256 ||
      inspection.mediaType !== file.mediaType ||
      inspection.width !== file.width ||
      inspection.height !== file.height
    ) {
      issues.push({
        code: 'VERIFICATION_MISMATCH',
        path: `$.files[${index}]`,
        message: 'Image size or checksum does not match the manifest.',
      })
      continue
    }
    verifiedByteCount += inspection.sizeBytes
  }

  if (issues.length > 0) {
    return { success: false, verifiedFileCount: 0, verifiedByteCount: 0, issues }
  }

  return {
    success: true,
    verifiedFileCount: validation.data.files.length,
    verifiedByteCount,
    issues: [],
  }
}

function hasExpectedExtension(targetPath: string, mediaType: LegacyPublicImageMediaType): boolean {
  const extension = targetPath.slice(targetPath.lastIndexOf('.') + 1)
  if (mediaType === 'image/jpeg') return extension === 'jpg' || extension === 'jpeg'
  if (mediaType === 'image/png') return extension === 'png'
  return extension === 'webp'
}

function validateOwner(
  input: unknown,
  expectedSourceKey: string | null,
  path: string,
  issues: LegacyImageManifestIssue[]
): LegacyPublicImageOwner | null {
  if (!isRecord(input)) {
    issues.push({
      code: 'INVALID_OWNER',
      path,
      message: 'Image owner must be an explicit fully qualified cast source reference.',
    })
    return null
  }
  appendUnknownFields(input, OWNER_FIELDS, path, issues)
  const sourceKey = normalizeNonEmptyString(input.sourceKey)
  const physicalTable = normalizeNonEmptyString(input.physicalTable)
  const legacyId = normalizeNonEmptyString(input.legacyId)
  if (
    !sourceKey ||
    sourceKey !== expectedSourceKey ||
    input.entity !== 'casts' ||
    !physicalTable ||
    !QUALIFIED_PHYSICAL_TABLE_PATTERN.test(physicalTable) ||
    !legacyId ||
    !legacyId.startsWith(`${physicalTable}:`) ||
    legacyId.length === physicalTable.length + 1
  ) {
    issues.push({
      code: 'INVALID_OWNER',
      path,
      message: 'Image owner must match the source and use a fully qualified cast identity.',
    })
    return null
  }
  return { sourceKey, entity: 'casts', physicalTable, legacyId }
}

function validateDimension(
  value: unknown,
  path: string,
  issues: LegacyImageManifestIssue[]
): number | null {
  if (!Number.isSafeInteger(value) || (value as number) <= 0) {
    issues.push({
      code: 'INVALID_MEDIA_DIMENSION',
      path,
      message: 'Image dimensions must be positive safe integers.',
    })
    return null
  }
  return value as number
}

function appendUnknownFields(
  input: Record<string, unknown>,
  supported: ReadonlySet<string>,
  path: string,
  issues: LegacyImageManifestIssue[]
): void {
  for (const field of Object.keys(input)) {
    if (!supported.has(field)) {
      issues.push({
        code: 'UNSUPPORTED_FIELD',
        path: `${path}.${field}`,
        message: 'Image manifest contains an unsupported field.',
      })
    }
  }
}

function validateRelativePath(
  value: unknown,
  path: string,
  issues: LegacyImageManifestIssue[]
): string | null {
  const normalized = normalizeNonEmptyString(value)
  const segments = normalized?.split('/') ?? []
  if (
    !normalized ||
    normalized.length > 512 ||
    normalized.includes('\\') ||
    normalized.includes('\0') ||
    normalized.startsWith('/') ||
    segments.some((segment) => !segment || segment === '.' || segment === '..')
  ) {
    issues.push({
      code: 'INVALID_PATH',
      path,
      message: 'Image paths must be normalized relative POSIX paths.',
    })
    return null
  }
  return normalized
}

function normalizeNonEmptyString(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const normalized = value.normalize('NFKC').trim()
  return normalized.length > 0 ? normalized : null
}

function normalizeIsoDateTime(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const time = Date.parse(value)
  if (!Number.isFinite(time)) return null
  const normalized = new Date(time).toISOString()
  return normalized === value ? normalized : null
}

function failure(
  code: LegacyImageManifestIssue['code'],
  path: string,
  message: string
): LegacyImageManifestValidation {
  return { success: false, issues: [{ code, path, message }] }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
