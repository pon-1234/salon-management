/**
 * @design_doc   docs/LEGACY_DATA_MIGRATION_RUNBOOK.md preview image filesystem adapter
 * @related_to   preview-image-import.ts verifies and coordinates isolated image copies
 * @known_issues The adapter requires a pre-provisioned local preview storage marker
 */
import { createHash } from 'node:crypto'
import {
  access,
  mkdir,
  mkdtemp,
  readFile,
  realpath,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
  calculateLegacyPreviewPreparedDigest,
  calculateLegacyPreviewRecordSha256,
  type LegacyPreviewPreparedDigestInput,
  type PreparedLegacyPreviewImport,
} from './preview-prepare'
import {
  createLegacyPreviewImageFilesystemIo,
  inspectLegacyPreviewImageSourcePackage,
} from './preview-image-filesystem'
import {
  executeLegacyPreviewImageImport,
  prepareLegacyPreviewImageImport,
  type LegacyPreviewImageImportIo,
  type LegacyPreviewImageSafetyInput,
} from './preview-image-import'
import { LEGACY_PREVIEW_ACKNOWLEDGEMENT } from './preview-safety'

const targetId = 'preview-target-20260720'
const mainContents = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAF/gL+Xn1gWQAAAABJRU5ErkJggg==',
  'base64'
)
const galleryContents = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl2nGQAAAAASUVORK5CYII=',
  'base64'
)

function digest(contents: Buffer): string {
  return createHash('sha256').update(contents).digest('hex')
}

function createPrepared(): PreparedLegacyPreviewImport {
  const cast = {
    source: {
      sourceKey: 'gold-main',
      entity: 'casts' as const,
      physicalTable: 'db_gold.girls',
      legacyId: 'db_gold.girls:cast-7',
    },
    store: {
      sourceKey: 'gold-main',
      entity: 'stores' as const,
      physicalTable: 'db_gold.shops',
      legacyId: 'db_gold.shops:store-1',
    },
    targetStoreId: 'store-1',
    name: 'Alice',
    age: 24,
    height: 160,
    bust: 'C',
    waist: 58,
    hip: 84,
    type: 'standard',
    image: '/salon-uploads/casts/gold-main/cast-7/main.png',
    images: [
      '/salon-uploads/casts/gold-main/cast-7/main.png',
      '/salon-uploads/casts/gold-main/cast-7/gallery.png',
    ],
    description: 'Profile',
    panelDesignationRank: 0,
    regularDesignationRank: 0,
    netReservation: true,
    workStatus: 'active' as const,
    createdAt: '2024-01-02T03:34:56.000Z',
  }
  const withoutDigest: LegacyPreviewPreparedDigestInput = {
    version: 1,
    sourceKey: 'gold-main',
    cutoffAt: '2026-07-20T01:00:00.000Z',
    canonicalExportSha256: 'c'.repeat(64),
    migrationManifestSha256: 'e'.repeat(64),
    snapshotManifestSha256: 'd'.repeat(64),
    extractorVersion: 'gambit-canonical-v1',
    transformationPolicyVersion: 'legacy-preview-policy-v1',
    approvedSourceTables: ['db_gold.girls'],
    reconciliation: {
      stores: { input: 0, accepted: 0, rejected: 0 },
      courses: { input: 0, accepted: 0, rejected: 0 },
      casts: { input: 1, accepted: 1, rejected: 0 },
      customers: { input: 0, accepted: 0, rejected: 0 },
      reservations: { input: 0, accepted: 0, rejected: 0 },
      castSchedules: { input: 0, accepted: 0, rejected: 0 },
      pointHistories: { input: 0, accepted: 0, rejected: 0 },
    },
    records: {
      stores: [],
      courses: [],
      casts: [{ record: cast, sourceHash: calculateLegacyPreviewRecordSha256('casts', cast) }],
      customers: [],
      reservations: [],
      castSchedules: [],
      pointHistories: [],
    },
  }
  return {
    ...withoutDigest,
    canonicalDigest: calculateLegacyPreviewPreparedDigest(withoutDigest),
  }
}

function createManifest() {
  return {
    version: 1,
    sourceKey: 'gold-main',
    capturedAt: '2026-07-20T01:00:00.000Z',
    files: [
      {
        sourcePath: 'public/girls/cast-7/main.png',
        targetPath: 'casts/gold-main/cast-7/main.png',
        owner: {
          sourceKey: 'gold-main',
          entity: 'casts',
          physicalTable: 'db_gold.girls',
          legacyId: 'db_gold.girls:cast-7',
        },
        slot: 1,
        mediaType: 'image/png',
        width: 1,
        height: 1,
        sha256: digest(mainContents),
        sizeBytes: mainContents.byteLength,
        visibility: 'public',
      },
      {
        sourcePath: 'public/girls/cast-7/gallery.png',
        targetPath: 'casts/gold-main/cast-7/gallery.png',
        owner: {
          sourceKey: 'gold-main',
          entity: 'casts',
          physicalTable: 'db_gold.girls',
          legacyId: 'db_gold.girls:cast-7',
        },
        slot: 2,
        mediaType: 'image/png',
        width: 1,
        height: 1,
        sha256: digest(galleryContents),
        sizeBytes: galleryContents.byteLength,
        visibility: 'public',
      },
    ],
  }
}

describe('createLegacyPreviewImageFilesystemIo', () => {
  let temporaryRoot: string
  let sourceRoot: string
  let targetRoot: string
  let safety: LegacyPreviewImageSafetyInput

  beforeEach(async () => {
    temporaryRoot = await mkdtemp(join(tmpdir(), 'salon-preview-image-test-'))
    sourceRoot = join(temporaryRoot, 'snapshot-images')
    targetRoot = join(temporaryRoot, 'salon-preview-storage', 'images')
    await mkdir(join(sourceRoot, 'public/girls/cast-7'), { recursive: true })
    await mkdir(targetRoot, { recursive: true })
    sourceRoot = await realpath(sourceRoot)
    targetRoot = await realpath(targetRoot)
    await writeFile(join(sourceRoot, 'public/girls/cast-7/main.png'), mainContents)
    await writeFile(join(sourceRoot, 'public/girls/cast-7/gallery.png'), galleryContents)
    await writeFile(
      join(targetRoot, '.legacy-preview-target.json'),
      JSON.stringify({ version: 1, environment: 'staging-preview', targetId })
    )
    safety = {
      runtimeMode: 'preview',
      outboundDeliveryMode: 'disabled',
      targetRoot,
      expectedTargetRoot: targetRoot,
      configuredTargetId: targetId,
      confirmedTargetId: targetId,
      acknowledgement: LEGACY_PREVIEW_ACKNOWLEDGEMENT,
    }
  })

  afterEach(async () => {
    await rm(temporaryRoot, { recursive: true, force: true })
  })

  function createPlan() {
    const preparation = prepareLegacyPreviewImageImport(createPrepared(), createManifest())
    if (!preparation.success) throw new Error('Expected image plan')
    return preparation.plan
  }

  function adapter(): LegacyPreviewImageImportIo {
    return createLegacyPreviewImageFilesystemIo({ sourceRoot, targetRoot })
  }

  it('inspects one source package without creating a target or trusting manifest metadata', async () => {
    const manifest = createManifest()

    const result = await inspectLegacyPreviewImageSourcePackage(sourceRoot, manifest.files)

    expect(result.inventory).toEqual(manifest.files.map(({ sourcePath }) => sourcePath).sort())
    expect(result.files).toEqual([
      {
        sourcePath: 'public/girls/cast-7/main.png',
        inspection: expect.objectContaining({
          isFile: true,
          isSymbolicLink: false,
          sha256: digest(mainContents),
          mediaType: 'image/png',
          width: 1,
          height: 1,
        }),
      },
      {
        sourcePath: 'public/girls/cast-7/gallery.png',
        inspection: expect.objectContaining({
          isFile: true,
          isSymbolicLink: false,
          sha256: digest(galleryContents),
          mediaType: 'image/png',
          width: 1,
          height: 1,
        }),
      },
    ])
  })

  it('streams files into exclusive target paths and reuses an exact second run', async () => {
    const plan = createPlan()
    const io = adapter()

    await expect(io.inspectTargetInventory()).resolves.toEqual([])
    const first = await executeLegacyPreviewImageImport(plan, safety, io)
    await expect(io.inspectTargetInventory()).resolves.toEqual(
      plan.files.map(({ targetPath }) => targetPath).sort()
    )
    const second = await executeLegacyPreviewImageImport(plan, safety, io)

    expect(first).toMatchObject({ success: true, createdFileCount: 2, reusedFileCount: 0 })
    expect(second).toMatchObject({ success: true, createdFileCount: 0, reusedFileCount: 2 })
    await expect(readFile(join(targetRoot, 'casts/gold-main/cast-7/main.png'))).resolves.toEqual(
      mainContents
    )
    await expect(readFile(join(targetRoot, 'casts/gold-main/cast-7/gallery.png'))).resolves.toEqual(
      galleryContents
    )
  })

  it('rejects a source symlink before creating any target image', async () => {
    const outside = join(temporaryRoot, 'outside-main.png')
    const sourceMain = join(sourceRoot, 'public/girls/cast-7/main.png')
    await writeFile(outside, mainContents)
    await rm(sourceMain)
    await symlink(outside, sourceMain)

    const result = await executeLegacyPreviewImageImport(createPlan(), safety, adapter())

    expect(result.success).toBe(false)
    expect(result.issues.map((issue) => issue.code)).toContain('SOURCE_FILE_SYMLINK')
    await expect(access(join(targetRoot, 'casts/gold-main/cast-7/gallery.png'))).rejects.toThrow()
    expect(JSON.stringify(result)).not.toContain(temporaryRoot)
    expect(JSON.stringify(result)).not.toContain('outside-main.png')
  })

  it('detects the actual streamed media type and dimensions instead of trusting metadata', async () => {
    const manifest = createManifest()
    manifest.files[0].width = 2
    const preparation = prepareLegacyPreviewImageImport(createPrepared(), manifest)
    if (!preparation.success) throw new Error('Expected image plan')

    const result = await executeLegacyPreviewImageImport(preparation.plan, safety, adapter())

    expect(result.success).toBe(false)
    expect(result.issues.map((issue) => issue.code)).toContain('SOURCE_VERIFICATION_MISMATCH')
    await expect(access(join(targetRoot, 'casts/gold-main/cast-7/main.png'))).rejects.toThrow()
  })

  it('detects approved JPEG and WebP headers with their real dimensions', async () => {
    const formatRoot = join(sourceRoot, 'formats')
    await mkdir(formatRoot)
    const jpeg = Buffer.from([
      0xff, 0xd8, 0xff, 0xc0, 0x00, 0x11, 0x08, 0x00, 0x02, 0x00, 0x03, 0x03, 0x01, 0x11, 0x00,
      0x02, 0x11, 0x00, 0x03, 0x11, 0x00, 0xff, 0xd9,
    ])
    const webp = Buffer.alloc(30)
    webp.write('RIFF', 0, 'ascii')
    webp.writeUInt32LE(22, 4)
    webp.write('WEBP', 8, 'ascii')
    webp.write('VP8X', 12, 'ascii')
    webp.writeUInt32LE(10, 16)
    webp.writeUIntLE(3, 24, 3)
    webp.writeUIntLE(4, 27, 3)
    await writeFile(join(formatRoot, 'sample.jpg'), jpeg)
    await writeFile(join(formatRoot, 'sample.webp'), webp)
    const io = adapter()
    const baseFile = createPlan().files[0]

    const jpegInspection = await io.inspectSource({
      ...baseFile,
      sourcePath: 'formats/sample.jpg',
    })
    const webpInspection = await io.inspectSource({
      ...baseFile,
      sourcePath: 'formats/sample.webp',
    })

    expect(jpegInspection).toMatchObject({ mediaType: 'image/jpeg', width: 3, height: 2 })
    expect(webpInspection).toMatchObject({ mediaType: 'image/webp', width: 4, height: 5 })
  })

  it('rejects a symlinked source parent that escapes the snapshot root', async () => {
    const outsideDirectory = join(temporaryRoot, 'outside-public')
    await mkdir(join(outsideDirectory, 'girls/cast-7'), { recursive: true })
    await writeFile(join(outsideDirectory, 'girls/cast-7/main.png'), mainContents)
    await writeFile(join(outsideDirectory, 'girls/cast-7/gallery.png'), galleryContents)
    await rm(join(sourceRoot, 'public'), { recursive: true })
    await symlink(outsideDirectory, join(sourceRoot, 'public'))

    const result = await executeLegacyPreviewImageImport(createPlan(), safety, adapter())

    expect(result.success).toBe(false)
    expect(result.createdFileCount).toBe(0)
    await expect(access(join(targetRoot, 'casts/gold-main/cast-7/main.png'))).rejects.toThrow()
  })

  it('does not overwrite a conflicting existing target', async () => {
    const targetMain = join(targetRoot, 'casts/gold-main/cast-7/main.png')
    await mkdir(join(targetRoot, 'casts/gold-main/cast-7'), { recursive: true })
    await writeFile(targetMain, 'different contents')

    const result = await executeLegacyPreviewImageImport(createPlan(), safety, adapter())

    expect(result.success).toBe(false)
    expect(result.issues.map((issue) => issue.code)).toContain('TARGET_INVENTORY_CONFLICT')
    await expect(readFile(targetMain, 'utf8')).resolves.toBe('different contents')
    await expect(access(join(targetRoot, 'casts/gold-main/cast-7/gallery.png'))).rejects.toThrow()
  })

  it('rejects an unplanned regular file anywhere in the target volume', async () => {
    await mkdir(join(targetRoot, 'stale'), { recursive: true })
    await writeFile(join(targetRoot, 'stale/private-image.png'), mainContents)

    const result = await executeLegacyPreviewImageImport(createPlan(), safety, adapter())

    expect(result.success).toBe(false)
    expect(result.issues.map((issue) => issue.code)).toEqual(['TARGET_INVENTORY_CONFLICT'])
    await expect(access(join(targetRoot, 'casts/gold-main/cast-7/main.png'))).rejects.toThrow()
    expect(JSON.stringify(result)).not.toContain('private-image.png')
  })

  it('rejects a symlink anywhere in the target volume without following it', async () => {
    const outside = join(temporaryRoot, 'outside-target.png')
    await writeFile(outside, mainContents)
    await symlink(outside, join(targetRoot, 'stale-link.png'))

    const result = await executeLegacyPreviewImageImport(createPlan(), safety, adapter())

    expect(result.success).toBe(false)
    expect(result.issues.map((issue) => issue.code)).toEqual(['TARGET_INVENTORY_INSPECTION_FAILED'])
    await expect(access(join(targetRoot, 'casts/gold-main/cast-7/main.png'))).rejects.toThrow()
    expect(JSON.stringify(result)).not.toContain('stale-link.png')
    expect(JSON.stringify(result)).not.toContain('outside-target.png')
  })

  it('uses exclusive creation and rolls back only its own earlier file after a race', async () => {
    const plan = createPlan()
    const base = adapter()
    const racedTarget = join(targetRoot, 'casts/gold-main/cast-7/gallery.png')
    const io: LegacyPreviewImageImportIo = {
      ...base,
      inspectTarget: async (file) => {
        const inspection = await base.inspectTarget(file)
        if (file.targetPath.endsWith('/gallery.png')) {
          await mkdir(join(targetRoot, 'casts/gold-main/cast-7'), { recursive: true })
          await writeFile(racedTarget, 'created-by-another-process', { flag: 'wx' })
        }
        return inspection
      },
    }

    const result = await executeLegacyPreviewImageImport(plan, safety, io)

    expect(result).toMatchObject({ success: false, rolledBackFileCount: 1 })
    await expect(access(join(targetRoot, 'casts/gold-main/cast-7/main.png'))).rejects.toThrow()
    await expect(readFile(racedTarget, 'utf8')).resolves.toBe('created-by-another-process')
  })

  it('rejects a target root symlink and an incorrect marker before file inspection', async () => {
    const realTarget = targetRoot
    const linkedTarget = join(temporaryRoot, 'linked-preview-storage')
    await symlink(realTarget, linkedTarget)
    const linkedSafety = { ...safety, targetRoot: linkedTarget, expectedTargetRoot: linkedTarget }

    const linkedResult = await executeLegacyPreviewImageImport(
      createPlan(),
      linkedSafety,
      createLegacyPreviewImageFilesystemIo({ sourceRoot, targetRoot: linkedTarget })
    )

    await writeFile(
      join(targetRoot, '.legacy-preview-target.json'),
      JSON.stringify({ version: 1, environment: 'production', targetId })
    )
    const markerResult = await executeLegacyPreviewImageImport(createPlan(), safety, adapter())

    expect(linkedResult.issues.map((issue) => issue.code)).toEqual(['TARGET_SAFETY_REJECTED'])
    expect(markerResult.issues.map((issue) => issue.code)).toEqual(['TARGET_SAFETY_REJECTED'])
    await expect(access(join(targetRoot, 'casts/gold-main/cast-7/main.png'))).rejects.toThrow()
  })
})
