/**
 * @design_doc   docs/LEGACY_DATA_MIGRATION_RUNBOOK.md verified Ikebukuro image package
 * @related_to   gold-master-fixture.ts consumes canonical URLs; preview-image-import.ts copies verified bytes
 * @known_issues This contract deliberately covers public cast photos only
 */
import {
  type LegacyImageInspection,
  type LegacyImageManifestV1,
  type LegacyPublicImageManifestEntry,
  validateLegacyImageManifest,
} from '@/lib/migration/legacy/image-manifest'

export const GOLD_MASTER_IMAGE_SOURCE_KEY = 'gold-master-ikebukuro-5600'
export const GOLD_MASTER_IMAGE_PHYSICAL_TABLE = 'nzuadtjn_gold_master.girls'

const PUBLIC_IMAGE_PREFIX = '/salon-uploads/'

export interface GoldMasterPreviewImageReference {
  girlNo: number
  slot: number
  fileName: string
}

export interface GoldMasterPreviewImageProjection {
  cutoffAt: string
  references: GoldMasterPreviewImageReference[]
}

export interface PreparedGoldMasterPreviewImages {
  plan: LegacyImageManifestV1
  resolveImageUrl(reference: GoldMasterPreviewImageReference): string
}

export class GoldMasterPreviewImageError extends Error {
  constructor() {
    super('GOLD_MASTER_PREVIEW_IMAGES_REJECTED')
    this.name = 'GoldMasterPreviewImageError'
  }
}

/** Builds a deterministic manifest from source files inspected without following symlinks. */
export async function buildGoldMasterPreviewImageManifest(
  projection: GoldMasterPreviewImageProjection,
  inspectFile: (sourcePath: string) => Promise<LegacyImageInspection>
): Promise<LegacyImageManifestV1> {
  assertProjection(projection)
  const files: LegacyPublicImageManifestEntry[] = []
  for (const reference of projection.references) {
    const sourcePath = `${reference.girlNo}/${reference.fileName}`
    let inspection: LegacyImageInspection
    try {
      inspection = await inspectFile(sourcePath)
    } catch {
      throw new GoldMasterPreviewImageError()
    }
    if (
      !inspection.isFile ||
      inspection.isSymbolicLink ||
      inspection.sizeBytes <= 0 ||
      !/^[a-f0-9]{64}$/u.test(inspection.sha256) ||
      inspection.width === null ||
      inspection.height === null ||
      inspection.mediaType === null
    ) {
      throw new GoldMasterPreviewImageError()
    }
    const extension = mediaExtension(inspection.mediaType)
    const slot = String(reference.slot).padStart(2, '0')
    files.push({
      sourcePath,
      targetPath: `casts/ikebukuro/legacy-cast-${reference.girlNo}/${slot}-${inspection.sha256.slice(0, 16)}.${extension}`,
      owner: {
        sourceKey: GOLD_MASTER_IMAGE_SOURCE_KEY,
        entity: 'casts',
        physicalTable: GOLD_MASTER_IMAGE_PHYSICAL_TABLE,
        legacyId: `${GOLD_MASTER_IMAGE_PHYSICAL_TABLE}:${reference.girlNo}`,
      },
      slot: reference.slot,
      mediaType: inspection.mediaType,
      width: inspection.width,
      height: inspection.height,
      sha256: inspection.sha256,
      sizeBytes: inspection.sizeBytes,
      visibility: 'public',
    })
  }
  return prepareGoldMasterPreviewImages(projection, {
    version: 1,
    sourceKey: GOLD_MASTER_IMAGE_SOURCE_KEY,
    capturedAt: projection.cutoffAt,
    files,
  }).plan
}

/** Binds one strict photo projection to a complete, verified public-image manifest. */
export function prepareGoldMasterPreviewImages(
  projection: GoldMasterPreviewImageProjection,
  manifestInput: unknown
): PreparedGoldMasterPreviewImages {
  assertProjection(projection)
  const validation = validateLegacyImageManifest(manifestInput, GOLD_MASTER_IMAGE_SOURCE_KEY)
  if (!validation.success) throw new GoldMasterPreviewImageError()

  const manifest = validation.data
  if (manifest.capturedAt !== projection.cutoffAt) throw new GoldMasterPreviewImageError()
  if (manifest.files.length !== projection.references.length) {
    throw new GoldMasterPreviewImageError()
  }

  const filesByReference = new Map<string, LegacyPublicImageManifestEntry>()
  for (const file of manifest.files) {
    const reference = projection.references.find(
      ({ girlNo, slot }) =>
        file.owner.legacyId === `${GOLD_MASTER_IMAGE_PHYSICAL_TABLE}:${girlNo}` &&
        file.slot === slot
    )
    if (!reference || !matchesReference(file, reference)) {
      throw new GoldMasterPreviewImageError()
    }
    const key = referenceKey(reference)
    if (filesByReference.has(key)) throw new GoldMasterPreviewImageError()
    filesByReference.set(key, file)
  }

  if (projection.references.some((reference) => !filesByReference.has(referenceKey(reference)))) {
    throw new GoldMasterPreviewImageError()
  }

  return {
    plan: manifest,
    resolveImageUrl(reference) {
      const file = filesByReference.get(referenceKey(reference))
      if (!file || !sameReference(reference, projection.references)) {
        throw new GoldMasterPreviewImageError()
      }
      return `${PUBLIC_IMAGE_PREFIX}${file.targetPath}`
    },
  }
}

function assertProjection(projection: GoldMasterPreviewImageProjection): void {
  if (new Date(projection.cutoffAt).toISOString() !== projection.cutoffAt) {
    throw new GoldMasterPreviewImageError()
  }
  const keys = new Set<string>()
  for (const reference of projection.references) {
    if (
      !Number.isSafeInteger(reference.girlNo) ||
      reference.girlNo <= 0 ||
      !Number.isSafeInteger(reference.slot) ||
      reference.slot < 1 ||
      reference.slot > 15 ||
      !isSafeFileName(reference.fileName)
    ) {
      throw new GoldMasterPreviewImageError()
    }
    const key = referenceKey(reference)
    if (keys.has(key)) throw new GoldMasterPreviewImageError()
    keys.add(key)
  }
}

function matchesReference(
  file: LegacyPublicImageManifestEntry,
  reference: GoldMasterPreviewImageReference
): boolean {
  const slot = String(reference.slot).padStart(2, '0')
  const owner = file.owner
  return (
    file.sourcePath === `${reference.girlNo}/${reference.fileName}` &&
    file.targetPath.startsWith(
      `casts/ikebukuro/legacy-cast-${reference.girlNo}/${slot}-${file.sha256.slice(0, 16)}.`
    ) &&
    owner.sourceKey === GOLD_MASTER_IMAGE_SOURCE_KEY &&
    owner.entity === 'casts' &&
    owner.physicalTable === GOLD_MASTER_IMAGE_PHYSICAL_TABLE &&
    owner.legacyId === `${GOLD_MASTER_IMAGE_PHYSICAL_TABLE}:${reference.girlNo}`
  )
}

function sameReference(
  reference: GoldMasterPreviewImageReference,
  approvedReferences: readonly GoldMasterPreviewImageReference[]
): boolean {
  return approvedReferences.some(
    (approved) =>
      approved.girlNo === reference.girlNo &&
      approved.slot === reference.slot &&
      approved.fileName === reference.fileName
  )
}

function referenceKey(reference: GoldMasterPreviewImageReference): string {
  return `${reference.girlNo}:${reference.slot}:${reference.fileName}`
}

function isSafeFileName(fileName: string): boolean {
  const normalized = fileName.normalize('NFC')
  return (
    normalized === fileName &&
    normalized.length > 0 &&
    normalized.length <= 255 &&
    normalized !== '.' &&
    normalized !== '..' &&
    !normalized.includes('/') &&
    !normalized.includes('\\') &&
    !normalized.includes('\0')
  )
}

function mediaExtension(mediaType: LegacyPublicImageManifestEntry['mediaType']): string {
  if (mediaType === 'image/jpeg') return 'jpg'
  if (mediaType === 'image/png') return 'png'
  return 'webp'
}
