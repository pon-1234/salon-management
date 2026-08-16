/**
 * @design_doc   docs/LEGACY_DATA_MIGRATION_RUNBOOK.md preview-only image import
 * @related_to   image-manifest.ts verifies package metadata; preview-safety.ts defines the operator acknowledgement
 * @known_issues Version 1 supports public cast images in an isolated filesystem target only
 */
import { createHash } from 'node:crypto'
import { isAbsolute, resolve, sep } from 'node:path'

import {
  type LegacyImageInspection,
  type LegacyImageManifestV1,
  type LegacyPublicImageManifestEntry,
  validateLegacyImageManifest,
} from './image-manifest'
import {
  calculateLegacyPreviewPreparedDigest,
  calculateLegacyPreviewRecordSha256,
  type PreparedLegacyPreviewImport,
} from './preview-prepare'
import { LEGACY_PREVIEW_ACKNOWLEDGEMENT } from './preview-safety'

const SHA256_PATTERN = /^[a-f0-9]{64}$/u
const TARGET_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{19,127}$/u
const PUBLIC_IMAGE_PREFIX = '/salon-uploads/'

export interface LegacyPreviewImageImportIssue {
  code:
    | 'COPY_FAILED'
    | 'COPY_VERIFICATION_MISMATCH'
    | 'CUTOFF_MISMATCH'
    | 'DUPLICATE_IMAGE_REFERENCE'
    | 'IMAGE_OWNER_MISMATCH'
    | 'IMAGE_SLOT_MISMATCH'
    | 'INVALID_CAST_IMAGE_REFERENCE'
    | 'INVALID_INPUT'
    | 'INVALID_PREPARED_DIGEST'
    | 'INVALID_PREPARED_RECORD_HASH'
    | 'MISSING_IMAGE_MANIFEST_ENTRY'
    | 'ROLLBACK_FAILED'
    | 'SOURCE_FILE_NOT_REGULAR'
    | 'SOURCE_FILE_SYMLINK'
    | 'SOURCE_FILE_UNREADABLE'
    | 'SOURCE_KEY_MISMATCH'
    | 'SOURCE_VERIFICATION_MISMATCH'
    | 'TARGET_CONFLICT'
    | 'TARGET_FILE_NOT_REGULAR'
    | 'TARGET_FILE_SYMLINK'
    | 'TARGET_INVENTORY_CONFLICT'
    | 'TARGET_INVENTORY_INSPECTION_FAILED'
    | 'TARGET_INSPECTION_FAILED'
    | 'TARGET_SAFETY_REJECTED'
    | 'UNREFERENCED_IMAGE'
    | 'UNSAFE_IMAGE_MANIFEST'
  path: string
  message: string
}

export interface LegacyPreviewImageImportPlan {
  version: 1
  sourceKey: string
  cutoffAt: string
  imageManifestSha256: string
  planDigest: string
  files: LegacyPublicImageManifestEntry[]
  prepared: PreparedLegacyPreviewImport
}

export type LegacyPreviewImagePreparationResult =
  | { success: true; plan: LegacyPreviewImageImportPlan; issues: [] }
  | { success: false; plan: null; issues: LegacyPreviewImageImportIssue[] }

export interface LegacyPreviewImageSafetyInput {
  runtimeMode: string | undefined
  outboundDeliveryMode: string | undefined
  targetRoot: string | undefined
  expectedTargetRoot: string | undefined
  configuredTargetId: string | undefined
  confirmedTargetId: string | undefined
  acknowledgement: string | undefined
}

export interface LegacyPreviewImageTargetIdentity {
  realRoot: string
  environment: string
  targetId: string
}

export interface LegacyPreviewImageImportIo {
  inspectTargetIdentity: () => Promise<LegacyPreviewImageTargetIdentity>
  /** Returns every regular file below the target root except its preview marker. */
  inspectTargetInventory: () => Promise<string[]>
  inspectSource: (file: LegacyPublicImageManifestEntry) => Promise<LegacyImageInspection>
  inspectTarget: (file: LegacyPublicImageManifestEntry) => Promise<LegacyImageInspection | null>
  copyExclusive: (file: LegacyPublicImageManifestEntry) => Promise<LegacyImageInspection>
  rollbackCreated: (file: LegacyPublicImageManifestEntry) => Promise<void>
}

export interface LegacyPreviewImageImportReport {
  success: boolean
  plannedFileCount: number
  verifiedByteCount: number
  createdFileCount: number
  reusedFileCount: number
  rolledBackFileCount: number
  issues: LegacyPreviewImageImportIssue[]
}

export type LegacyPreviewImageTargetPreflightResult =
  | { success: true; mode: 'create' | 'reuse'; issues: [] }
  | { success: false; mode: null; issues: LegacyPreviewImageImportIssue[] }

export function prepareLegacyPreviewImageImport(
  preparedInput: unknown,
  manifestInput: unknown
): LegacyPreviewImagePreparationResult {
  if (!isStrictJsonValue(preparedInput) || !isStrictJsonValue(manifestInput)) {
    return preparationFailure([
      issue('INVALID_INPUT', '$', 'Image planning inputs must be strict JSON values.'),
    ])
  }

  const preparedRead = readPreparedImport(preparedInput)
  if (!preparedRead.prepared) return preparationFailure(preparedRead.issues)

  const prepared = preparedRead.prepared
  const manifestValidation = validateLegacyImageManifest(manifestInput, prepared.sourceKey)
  if (!manifestValidation.success) {
    return preparationFailure([
      ...preparedRead.issues,
      ...manifestValidation.issues.map((manifestIssue) =>
        issue(
          manifestIssue.code === 'SOURCE_KEY_MISMATCH'
            ? 'SOURCE_KEY_MISMATCH'
            : 'UNSAFE_IMAGE_MANIFEST',
          manifestIssue.path,
          manifestIssue.message
        )
      ),
    ])
  }

  const manifest = manifestValidation.data
  const issues = [...preparedRead.issues]
  if (manifest.capturedAt !== prepared.cutoffAt) {
    issues.push(
      issue(
        'CUTOFF_MISMATCH',
        '$.imageManifest.capturedAt',
        'Image capture time must exactly match the prepared snapshot cutoff.'
      )
    )
  }

  const entriesByCanonicalUrl = new Map(
    manifest.files.map((file) => [canonicalPublicUrl(file.targetPath), file])
  )
  const referencedUrls = new Set<string>()
  const urlOwners = new Map<string, number>()
  prepared.records.casts.forEach((preparedCast, castIndex) => {
    const cast = preparedCast.record
    const gallerySeen = new Set<string>()
    const references: Array<{ value: string; path: string; expectedSlot: number }> = []

    if (cast.image !== null) {
      if (typeof cast.image === 'string' && cast.image.length > 0) {
        references.push({
          value: cast.image,
          path: `$.prepared.records.casts[${castIndex}].record.image`,
          expectedSlot: 1,
        })
      } else {
        issues.push(
          issue(
            'INVALID_CAST_IMAGE_REFERENCE',
            `$.prepared.records.casts[${castIndex}].record.image`,
            'Cast primary image must be null or a non-empty canonical storage URL.'
          )
        )
      }
    }

    if (!Array.isArray(cast.images)) {
      issues.push(
        issue(
          'INVALID_CAST_IMAGE_REFERENCE',
          `$.prepared.records.casts[${castIndex}].record.images`,
          'Cast gallery images must be an array of canonical storage URLs.'
        )
      )
    } else {
      cast.images.forEach((value, imageIndex) => {
        const path = `$.prepared.records.casts[${castIndex}].record.images[${imageIndex}]`
        if (typeof value !== 'string' || value.length === 0) {
          issues.push(
            issue(
              'INVALID_CAST_IMAGE_REFERENCE',
              path,
              'Cast gallery image must be a non-empty canonical storage URL.'
            )
          )
          return
        }
        if (gallerySeen.has(value)) {
          issues.push(
            issue(
              'DUPLICATE_IMAGE_REFERENCE',
              path,
              'A cast gallery cannot contain the same image more than once.'
            )
          )
        }
        gallerySeen.add(value)
        references.push({ value, path, expectedSlot: imageIndex + 1 })
      })
    }

    for (const reference of references) {
      if (!reference.value.startsWith(PUBLIC_IMAGE_PREFIX)) {
        issues.push(
          issue(
            'INVALID_CAST_IMAGE_REFERENCE',
            reference.path,
            'Cast images must use canonical preview storage URLs.'
          )
        )
        continue
      }
      const entry = entriesByCanonicalUrl.get(reference.value)
      if (!entry) {
        issues.push(
          issue(
            'MISSING_IMAGE_MANIFEST_ENTRY',
            reference.path,
            'A cast image has no matching entry in the verified image manifest.'
          )
        )
        continue
      }

      referencedUrls.add(reference.value)
      if (!sameCastOwner(entry.owner, cast.source)) {
        issues.push(
          issue(
            'IMAGE_OWNER_MISMATCH',
            reference.path,
            'Image owner does not match the prepared cast source identity.'
          )
        )
      }
      if (entry.slot !== reference.expectedSlot) {
        issues.push(
          issue(
            'IMAGE_SLOT_MISMATCH',
            reference.path,
            'Image slot does not match the prepared cast image order.'
          )
        )
      }
      const existingOwner = urlOwners.get(reference.value)
      if (existingOwner !== undefined && existingOwner !== castIndex) {
        issues.push(
          issue(
            'DUPLICATE_IMAGE_REFERENCE',
            reference.path,
            'An image manifest entry cannot be assigned to more than one cast.'
          )
        )
      } else {
        urlOwners.set(reference.value, castIndex)
      }
    }
  })

  manifest.files.forEach((file, fileIndex) => {
    if (!referencedUrls.has(canonicalPublicUrl(file.targetPath))) {
      issues.push(
        issue(
          'UNREFERENCED_IMAGE',
          `$.imageManifest.files[${fileIndex}]`,
          'Every image manifest entry must be referenced by exactly one prepared cast.'
        )
      )
    }
  })

  if (issues.length > 0) return preparationFailure(issues)

  const boundPrepared = structuredClone(prepared)
  const imageManifestSha256 = calculateImageManifestSha256(manifest)
  const planDigest = calculatePlanDigest(boundPrepared, imageManifestSha256)

  return {
    success: true,
    plan: {
      version: 1,
      sourceKey: prepared.sourceKey,
      cutoffAt: prepared.cutoffAt,
      imageManifestSha256,
      planDigest,
      files: structuredClone(manifest.files),
      prepared: boundPrepared,
    },
    issues: [],
  }
}

export async function executeLegacyPreviewImageImport(
  plan: LegacyPreviewImageImportPlan,
  safety: LegacyPreviewImageSafetyInput,
  io: LegacyPreviewImageImportIo
): Promise<LegacyPreviewImageImportReport> {
  if (!isValidPlan(plan)) {
    const emptyReport = report(plan.files.length)
    emptyReport.issues.push(
      issue('INVALID_INPUT', '$.plan', 'The image import plan failed its integrity check.')
    )
    return emptyReport
  }
  return executeVerifiedImageFiles(plan.files, safety, io)
}

/** Copies one standalone manifest after validating its schema and approved source identity. */
export async function executeVerifiedLegacyPreviewImageCopy(
  manifestInput: unknown,
  expectedSourceKey: string,
  safety: LegacyPreviewImageSafetyInput,
  io: LegacyPreviewImageImportIo
): Promise<LegacyPreviewImageImportReport> {
  const validation = validateLegacyImageManifest(manifestInput, expectedSourceKey)
  if (!validation.success) {
    const rejected = report(0)
    rejected.issues.push(
      issue('INVALID_INPUT', '$.manifest', 'The image manifest failed its integrity check.')
    )
    return rejected
  }
  return executeVerifiedImageFiles(validation.data.files, safety, io)
}

async function executeVerifiedImageFiles(
  files: LegacyPublicImageManifestEntry[],
  safety: LegacyPreviewImageSafetyInput,
  io: LegacyPreviewImageImportIo
): Promise<LegacyPreviewImageImportReport> {
  const emptyReport = report(files.length)
  const targetPreflight = await preflightLegacyPreviewImageTarget(
    files.map(({ targetPath }) => targetPath),
    safety,
    io
  )
  if (!targetPreflight.success) {
    emptyReport.issues.push(...targetPreflight.issues)
    return emptyReport
  }

  let verifiedByteCount = 0
  for (const [fileIndex, file] of files.entries()) {
    let inspection: LegacyImageInspection
    try {
      inspection = await io.inspectSource(file)
    } catch {
      emptyReport.issues.push(
        issue(
          'SOURCE_FILE_UNREADABLE',
          `$.files[${fileIndex}]`,
          'A source image could not be inspected.'
        )
      )
      continue
    }
    const sourceIssue = validateInspection(inspection, file, 'SOURCE', fileIndex)
    if (sourceIssue) {
      emptyReport.issues.push(sourceIssue)
    } else {
      verifiedByteCount += inspection.sizeBytes
    }
  }
  if (emptyReport.issues.length > 0) return emptyReport

  const filesToCreate: LegacyPublicImageManifestEntry[] = []
  let reusedFileCount = 0
  for (const [fileIndex, file] of files.entries()) {
    let inspection: LegacyImageInspection | null
    try {
      inspection = await io.inspectTarget(file)
    } catch {
      emptyReport.issues.push(
        issue(
          'TARGET_INSPECTION_FAILED',
          `$.files[${fileIndex}]`,
          'A preview target image could not be inspected.'
        )
      )
      continue
    }
    if (inspection === null) {
      if (targetPreflight.mode === 'create') {
        filesToCreate.push(file)
      } else {
        emptyReport.issues.push(
          issue(
            'TARGET_INVENTORY_CONFLICT',
            `$.files[${fileIndex}]`,
            'The preview target inventory changed after its safety preflight.'
          )
        )
      }
      continue
    }
    if (targetPreflight.mode === 'create') {
      emptyReport.issues.push(
        issue(
          'TARGET_INVENTORY_CONFLICT',
          `$.files[${fileIndex}]`,
          'The preview target inventory changed after its safety preflight.'
        )
      )
      continue
    }
    const targetIssue = validateInspection(inspection, file, 'TARGET', fileIndex)
    if (targetIssue) {
      emptyReport.issues.push(targetIssue)
    } else {
      reusedFileCount += 1
    }
  }
  if (emptyReport.issues.length > 0) {
    emptyReport.verifiedByteCount = verifiedByteCount
    return emptyReport
  }

  const created: LegacyPublicImageManifestEntry[] = []
  for (const file of filesToCreate) {
    try {
      const copied = await io.copyExclusive(file)
      created.push(file)
      const copyIssue = validateInspection(copied, file, 'COPY', files.indexOf(file))
      if (copyIssue) {
        emptyReport.issues.push(copyIssue)
        break
      }
    } catch {
      emptyReport.issues.push(
        issue('COPY_FAILED', '$.files', 'An exclusive preview image copy failed.')
      )
      if (await targetMayRemainAfterFailedCopy(io, file)) {
        emptyReport.issues.push(
          issue(
            'ROLLBACK_FAILED',
            '$.rollback',
            'The failed image target could not be proven absent after cleanup.'
          )
        )
      }
      break
    }
  }

  if (emptyReport.issues.length > 0) {
    let rolledBackFileCount = 0
    for (const file of [...created].reverse()) {
      try {
        await io.rollbackCreated(file)
        rolledBackFileCount += 1
      } catch {
        emptyReport.issues.push(
          issue(
            'ROLLBACK_FAILED',
            '$.rollback',
            'A newly created image could not be safely rolled back.'
          )
        )
      }
    }
    return {
      ...emptyReport,
      verifiedByteCount,
      createdFileCount: created.length - rolledBackFileCount,
      reusedFileCount: 0,
      rolledBackFileCount,
    }
  }

  return {
    success: true,
    plannedFileCount: files.length,
    verifiedByteCount,
    createdFileCount: created.length,
    reusedFileCount,
    rolledBackFileCount: 0,
    issues: [],
  }
}

export async function preflightLegacyPreviewImageTarget(
  expectedTargetPaths: readonly string[],
  safety: LegacyPreviewImageSafetyInput,
  io: LegacyPreviewImageImportIo
): Promise<LegacyPreviewImageTargetPreflightResult> {
  try {
    const identity = await io.inspectTargetIdentity()
    assertLegacyPreviewImageTarget(safety, identity)
  } catch {
    return targetPreflightFailure(
      issue(
        'TARGET_SAFETY_REJECTED',
        '$.target',
        'The isolated preview image target could not be proven safe.'
      )
    )
  }

  let inventory: string[]
  try {
    inventory = await io.inspectTargetInventory()
  } catch {
    return targetPreflightFailure(
      issue(
        'TARGET_INVENTORY_INSPECTION_FAILED',
        '$.targetInventory',
        'The preview target inventory could not be proven safe and complete.'
      )
    )
  }

  const actualPaths = normalizeTargetInventory(inventory)
  const expectedPaths = normalizeTargetInventory(expectedTargetPaths)
  if (!actualPaths || !expectedPaths) {
    return targetPreflightFailure(
      issue(
        'TARGET_INVENTORY_INSPECTION_FAILED',
        '$.targetInventory',
        'The preview target inventory could not be proven safe and complete.'
      )
    )
  }
  if (actualPaths.length === 0) return { success: true, mode: 'create', issues: [] }
  if (sameStrings(actualPaths, expectedPaths)) {
    return { success: true, mode: 'reuse', issues: [] }
  }
  return targetPreflightFailure(
    issue(
      'TARGET_INVENTORY_CONFLICT',
      '$.targetInventory',
      'The preview target contains a partial or unapproved file set.'
    )
  )
}

async function targetMayRemainAfterFailedCopy(
  io: LegacyPreviewImageImportIo,
  file: LegacyPublicImageManifestEntry
): Promise<boolean> {
  try {
    return (await io.inspectTarget(file)) !== null
  } catch {
    return true
  }
}

export function assertLegacyPreviewImageTarget(
  safety: LegacyPreviewImageSafetyInput,
  identity: LegacyPreviewImageTargetIdentity
): void {
  if (safety.runtimeMode !== 'preview') throw new LegacyPreviewImageSafetyError()
  if (safety.outboundDeliveryMode !== 'disabled') throw new LegacyPreviewImageSafetyError()
  if (safety.acknowledgement !== LEGACY_PREVIEW_ACKNOWLEDGEMENT) {
    throw new LegacyPreviewImageSafetyError()
  }

  const targetRoot = normalizeAbsoluteRoot(safety.targetRoot)
  const expectedTargetRoot = normalizeAbsoluteRoot(safety.expectedTargetRoot)
  const realRoot = normalizeAbsoluteRoot(identity.realRoot)
  if (
    !targetRoot ||
    !expectedTargetRoot ||
    !realRoot ||
    targetRoot !== expectedTargetRoot ||
    targetRoot !== realRoot ||
    !hasPreviewSegment(targetRoot)
  ) {
    throw new LegacyPreviewImageSafetyError()
  }

  const configuredTargetId = normalizeTargetId(safety.configuredTargetId)
  const confirmedTargetId = normalizeTargetId(safety.confirmedTargetId)
  const actualTargetId = normalizeTargetId(identity.targetId)
  if (
    !configuredTargetId ||
    !confirmedTargetId ||
    !actualTargetId ||
    configuredTargetId !== confirmedTargetId ||
    configuredTargetId !== actualTargetId ||
    identity.environment !== 'staging-preview'
  ) {
    throw new LegacyPreviewImageSafetyError()
  }
}

function readPreparedImport(input: unknown): {
  prepared: PreparedLegacyPreviewImport | null
  issues: LegacyPreviewImageImportIssue[]
} {
  if (!isRecord(input)) {
    return {
      prepared: null,
      issues: [issue('INVALID_INPUT', '$.prepared', 'Prepared preview import must be an object.')],
    }
  }
  if (
    input.version !== 1 ||
    typeof input.sourceKey !== 'string' ||
    input.sourceKey.length === 0 ||
    typeof input.cutoffAt !== 'string' ||
    !isRecord(input.records) ||
    !Array.isArray(input.records.casts) ||
    typeof input.canonicalDigest !== 'string'
  ) {
    return {
      prepared: null,
      issues: [
        issue('INVALID_INPUT', '$.prepared', 'Prepared preview import has an invalid shape.'),
      ],
    }
  }

  const prepared = input as unknown as PreparedLegacyPreviewImport
  const issues: LegacyPreviewImageImportIssue[] = []
  let invalidCastShape = false
  try {
    const { canonicalDigest: _canonicalDigest, ...withoutDigest } = prepared
    if (
      !SHA256_PATTERN.test(prepared.canonicalDigest) ||
      calculateLegacyPreviewPreparedDigest(withoutDigest) !== prepared.canonicalDigest
    ) {
      issues.push(
        issue(
          'INVALID_PREPARED_DIGEST',
          '$.prepared.canonicalDigest',
          'Prepared preview import digest does not match its contents.'
        )
      )
    }

    prepared.records.casts.forEach((candidate, castIndex) => {
      if (!isRecord(candidate) || !isRecord(candidate.record)) {
        invalidCastShape = true
        issues.push(
          issue(
            'INVALID_INPUT',
            `$.prepared.records.casts[${castIndex}]`,
            'Prepared cast record has an invalid shape.'
          )
        )
        return
      }
      if (
        typeof candidate.sourceHash !== 'string' ||
        calculateLegacyPreviewRecordSha256('casts', candidate.record) !== candidate.sourceHash
      ) {
        issues.push(
          issue(
            'INVALID_PREPARED_RECORD_HASH',
            `$.prepared.records.casts[${castIndex}].sourceHash`,
            'Prepared cast record hash does not match its contents.'
          )
        )
      }
    })
  } catch {
    issues.push(
      issue('INVALID_INPUT', '$.prepared', 'Prepared preview import cannot be safely hashed.')
    )
  }
  return { prepared: invalidCastShape ? null : prepared, issues }
}

function validateInspection(
  inspection: LegacyImageInspection,
  file: LegacyPublicImageManifestEntry,
  phase: 'SOURCE' | 'TARGET' | 'COPY',
  fileIndex: number
): LegacyPreviewImageImportIssue | null {
  const path = `$.files[${fileIndex}]`
  if (inspection.isSymbolicLink) {
    return issue(
      phase === 'SOURCE' ? 'SOURCE_FILE_SYMLINK' : 'TARGET_FILE_SYMLINK',
      path,
      'Symbolic links are forbidden in preview image imports.'
    )
  }
  if (!inspection.isFile) {
    return issue(
      phase === 'SOURCE' ? 'SOURCE_FILE_NOT_REGULAR' : 'TARGET_FILE_NOT_REGULAR',
      path,
      'Preview image entries must resolve to regular files.'
    )
  }
  if (
    inspection.sizeBytes !== file.sizeBytes ||
    inspection.sha256 !== file.sha256 ||
    inspection.mediaType !== file.mediaType ||
    inspection.width !== file.width ||
    inspection.height !== file.height
  ) {
    const code =
      phase === 'SOURCE'
        ? 'SOURCE_VERIFICATION_MISMATCH'
        : phase === 'COPY'
          ? 'COPY_VERIFICATION_MISMATCH'
          : 'TARGET_CONFLICT'
    return issue(
      code,
      path,
      'Image bytes, media type, or dimensions do not match the approved manifest.'
    )
  }
  return null
}

function isValidPlan(plan: LegacyPreviewImageImportPlan): boolean {
  if (!isStrictJsonValue(plan)) return false
  if (
    plan.version !== 1 ||
    plan.sourceKey !== plan.prepared.sourceKey ||
    plan.cutoffAt !== plan.prepared.cutoffAt ||
    !SHA256_PATTERN.test(plan.imageManifestSha256) ||
    !SHA256_PATTERN.test(plan.planDigest)
  ) {
    return false
  }
  const preparedRead = readPreparedImport(plan.prepared)
  if (!preparedRead.prepared || preparedRead.issues.length > 0) return false
  const manifest: LegacyImageManifestV1 = {
    version: 1,
    sourceKey: plan.sourceKey,
    capturedAt: plan.cutoffAt,
    files: plan.files,
  }
  const manifestValidation = validateLegacyImageManifest(manifest, plan.sourceKey)
  return (
    manifestValidation.success &&
    calculateImageManifestSha256(manifestValidation.data) === plan.imageManifestSha256 &&
    calculatePlanDigest(plan.prepared, plan.imageManifestSha256) === plan.planDigest
  )
}

function calculateImageManifestSha256(manifest: LegacyImageManifestV1): string {
  return sha256(`legacy-preview-image-manifest:v1\0${stableJson(manifest)}`)
}

function calculatePlanDigest(
  prepared: PreparedLegacyPreviewImport,
  imageManifestSha256: string
): string {
  return sha256(
    `legacy-preview-image-plan:v1\0${stableJson({
      preparedDigest: prepared.canonicalDigest,
      imageManifestSha256,
    })}`
  )
}

function canonicalPublicUrl(targetPath: string): string {
  return `${PUBLIC_IMAGE_PREFIX}${targetPath}`
}

function sameCastOwner(
  owner: LegacyPublicImageManifestEntry['owner'],
  source: PreparedLegacyPreviewImport['records']['casts'][number]['record']['source']
): boolean {
  return (
    owner.sourceKey === source.sourceKey &&
    owner.entity === source.entity &&
    owner.physicalTable === source.physicalTable &&
    owner.legacyId === source.legacyId
  )
}

function normalizeAbsoluteRoot(value: string | undefined): string | null {
  if (typeof value !== 'string' || !isAbsolute(value) || value === sep) return null
  const normalized = resolve(value)
  return normalized === value ? normalized : null
}

function hasPreviewSegment(path: string): boolean {
  return path
    .split(sep)
    .filter(Boolean)
    .some((segment) => segment.toLowerCase().includes('preview'))
}

function normalizeTargetId(value: string | undefined): string | null {
  if (typeof value !== 'string' || !TARGET_ID_PATTERN.test(value)) return null
  return value
}

function preparationFailure(
  issues: LegacyPreviewImageImportIssue[]
): LegacyPreviewImagePreparationResult {
  return { success: false, plan: null, issues }
}

function report(plannedFileCount: number): LegacyPreviewImageImportReport {
  return {
    success: false,
    plannedFileCount,
    verifiedByteCount: 0,
    createdFileCount: 0,
    reusedFileCount: 0,
    rolledBackFileCount: 0,
    issues: [],
  }
}

function normalizeTargetInventory(paths: readonly string[]): string[] | null {
  if (!Array.isArray(paths)) return null
  const unique = new Set<string>()
  for (const path of paths) {
    if (
      typeof path !== 'string' ||
      path.length === 0 ||
      path.length > 512 ||
      path.startsWith('/') ||
      path.includes('\\') ||
      path.includes('\0') ||
      path.split('/').some((segment) => !segment || segment === '.' || segment === '..') ||
      unique.has(path)
    ) {
      return null
    }
    unique.add(path)
  }
  return [...unique].sort((left, right) => left.localeCompare(right, 'en'))
}

function sameStrings(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index])
}

function targetPreflightFailure(
  targetIssue: LegacyPreviewImageImportIssue
): Extract<LegacyPreviewImageTargetPreflightResult, { success: false }> {
  return { success: false, mode: null, issues: [targetIssue] }
}

function issue(
  code: LegacyPreviewImageImportIssue['code'],
  path: string,
  message: string
): LegacyPreviewImageImportIssue {
  return { code, path, message }
}

function isStrictJsonValue(value: unknown, ancestors = new Set<object>()): boolean {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return true
  if (typeof value === 'number') return Number.isFinite(value)
  if (typeof value !== 'object') return false
  if (ancestors.has(value)) return false

  const prototype = Object.getPrototypeOf(value)
  if (Array.isArray(value)) {
    if (prototype !== Array.prototype || Object.keys(value).length !== value.length) return false
    ancestors.add(value)
    const valid = value.every((entry) => isStrictJsonValue(entry, ancestors))
    ancestors.delete(value)
    return valid
  } else if (prototype !== Object.prototype && prototype !== null) {
    return false
  }

  const descriptors = Object.getOwnPropertyDescriptors(value)
  if (
    Reflect.ownKeys(value).some((key) => {
      if (typeof key !== 'string') return true
      const descriptor = descriptors[key]
      return !descriptor?.enumerable || !('value' in descriptor)
    })
  ) {
    return false
  }

  ancestors.add(value)
  const valid = Object.values(descriptors).every(
    (descriptor) => 'value' in descriptor && isStrictJsonValue(descriptor.value, ancestors)
  )
  ancestors.delete(value)
  return valid
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function stableJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`
  return `{${Object.entries(value as Record<string, unknown>)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, entry]) => `${JSON.stringify(key)}:${stableJson(entry)}`)
    .join(',')}}`
}

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex')
}

class LegacyPreviewImageSafetyError extends Error {}
