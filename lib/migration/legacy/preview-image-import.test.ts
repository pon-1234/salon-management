/**
 * @design_doc   docs/LEGACY_DATA_MIGRATION_RUNBOOK.md preview-only image import
 * @related_to   preview-image-import.ts binds verified legacy image files to prepared cast rows
 * @known_issues Version 1 supports public cast images only
 */
import { describe, expect, it, vi } from 'vitest'

import {
  calculateLegacyPreviewPreparedDigest,
  calculateLegacyPreviewRecordSha256,
  type LegacyPreviewPreparedDigestInput,
  type PreparedLegacyPreviewImport,
} from './preview-prepare'
import { LEGACY_PREVIEW_ACKNOWLEDGEMENT } from './preview-safety'
import * as legacyMigration from './index'
import {
  executeLegacyPreviewImageImport,
  executeVerifiedLegacyPreviewImageCopy,
  prepareLegacyPreviewImageImport,
  type LegacyPreviewImageImportIo,
  type LegacyPreviewImageSafetyInput,
} from './preview-image-import'

const mainContents = Buffer.from('main-image')
const galleryContents = Buffer.from('gallery-image')
const mainHash = 'a'.repeat(64)
const galleryHash = 'b'.repeat(64)

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
    image: '/salon-uploads/casts/gold-main/cast-7/main.jpg',
    images: [
      '/salon-uploads/casts/gold-main/cast-7/main.jpg',
      '/salon-uploads/casts/gold-main/cast-7/gallery.jpg',
    ],
    description: 'Profile',
    panelDesignationRank: 0,
    regularDesignationRank: 0,
    netReservation: true,
    workStatus: 'active' as const,
    createdAt: '2024-01-02T03:34:56.000Z',
  }
  const preparedWithoutDigest: LegacyPreviewPreparedDigestInput = {
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
      casts: [
        {
          record: cast,
          sourceHash: calculateLegacyPreviewRecordSha256('casts', cast),
        },
      ],
      customers: [],
      reservations: [],
      castSchedules: [],
      pointHistories: [],
    },
  }
  return {
    ...preparedWithoutDigest,
    canonicalDigest: calculateLegacyPreviewPreparedDigest(preparedWithoutDigest),
  }
}

function createManifest() {
  return {
    version: 1,
    sourceKey: 'gold-main',
    capturedAt: '2026-07-20T01:00:00.000Z',
    files: [
      {
        sourcePath: 'public/girls/cast-7/main.jpg',
        targetPath: 'casts/gold-main/cast-7/main.jpg',
        owner: {
          sourceKey: 'gold-main',
          entity: 'casts',
          physicalTable: 'db_gold.girls',
          legacyId: 'db_gold.girls:cast-7',
        },
        slot: 1,
        mediaType: 'image/jpeg',
        width: 800,
        height: 1200,
        sha256: mainHash,
        sizeBytes: mainContents.byteLength,
        visibility: 'public',
      },
      {
        sourcePath: 'public/girls/cast-7/gallery.jpg',
        targetPath: 'casts/gold-main/cast-7/gallery.jpg',
        owner: {
          sourceKey: 'gold-main',
          entity: 'casts',
          physicalTable: 'db_gold.girls',
          legacyId: 'db_gold.girls:cast-7',
        },
        slot: 2,
        mediaType: 'image/jpeg',
        width: 900,
        height: 1200,
        sha256: galleryHash,
        sizeBytes: galleryContents.byteLength,
        visibility: 'public',
      },
    ],
  }
}

const safety: LegacyPreviewImageSafetyInput = {
  runtimeMode: 'preview',
  outboundDeliveryMode: 'disabled',
  targetRoot: '/srv/salon-preview-storage/images',
  expectedTargetRoot: '/srv/salon-preview-storage/images',
  configuredTargetId: 'preview-target-20260720',
  confirmedTargetId: 'preview-target-20260720',
  acknowledgement: LEGACY_PREVIEW_ACKNOWLEDGEMENT,
}

function createIo(overrides: Partial<LegacyPreviewImageImportIo> = {}): LegacyPreviewImageImportIo {
  return {
    inspectTargetIdentity: vi.fn().mockResolvedValue({
      realRoot: '/srv/salon-preview-storage/images',
      environment: 'staging-preview',
      targetId: 'preview-target-20260720',
    }),
    inspectTargetInventory: vi.fn().mockResolvedValue([]),
    inspectSource: vi.fn().mockImplementation(async (file) => ({
      isFile: true,
      isSymbolicLink: false,
      sizeBytes: file.sizeBytes,
      sha256: file.sha256,
      mediaType: file.mediaType,
      width: file.width,
      height: file.height,
    })),
    inspectTarget: vi.fn().mockResolvedValue(null),
    copyExclusive: vi.fn().mockImplementation(async (file) => ({
      isFile: true,
      isSymbolicLink: false,
      sizeBytes: file.sizeBytes,
      sha256: file.sha256,
      mediaType: file.mediaType,
      width: file.width,
      height: file.height,
    })),
    rollbackCreated: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }
}

describe('prepareLegacyPreviewImageImport', () => {
  it('is exposed through the legacy migration public boundary', () => {
    expect(legacyMigration.prepareLegacyPreviewImageImport).toBe(prepareLegacyPreviewImageImport)
    expect(legacyMigration.executeLegacyPreviewImageImport).toBe(executeLegacyPreviewImageImport)
    expect(legacyMigration.executeVerifiedLegacyPreviewImageCopy).toBe(
      executeVerifiedLegacyPreviewImageCopy
    )
    expect(legacyMigration.createLegacyPreviewImageFilesystemIo).toBeTypeOf('function')
  })

  it('binds canonical cast URLs to target paths without changing prepared hashes', () => {
    const original = createPrepared()
    const result = prepareLegacyPreviewImageImport(original, createManifest())

    expect(result.success).toBe(true)
    if (!result.success) throw new Error('Expected image plan')
    expect(result.plan.prepared.records.casts[0].record).toMatchObject({
      image: '/salon-uploads/casts/gold-main/cast-7/main.jpg',
      images: [
        '/salon-uploads/casts/gold-main/cast-7/main.jpg',
        '/salon-uploads/casts/gold-main/cast-7/gallery.jpg',
      ],
    })
    expect(result.plan.prepared.records.casts[0].sourceHash).toBe(
      original.records.casts[0].sourceHash
    )
    expect(result.plan.prepared.canonicalDigest).toBe(original.canonicalDigest)
    expect(result.plan.prepared).toEqual(original)
    expect(result.plan.files).toHaveLength(2)
  })

  it.each([
    [
      'a cast image missing from the manifest',
      (prepared: PreparedLegacyPreviewImport, manifest: ReturnType<typeof createManifest>) => {
        prepared.records.casts[0].record.images.push('/salon-uploads/casts/gold-main/missing.jpg')
        return { prepared, manifest }
      },
      'MISSING_IMAGE_MANIFEST_ENTRY',
    ],
    [
      'a non-canonical legacy source path',
      (prepared: PreparedLegacyPreviewImport, manifest: ReturnType<typeof createManifest>) => {
        prepared.records.casts[0].record.image = 'public/girls/cast-7/main.jpg'
        return { prepared, manifest }
      },
      'INVALID_CAST_IMAGE_REFERENCE',
    ],
    [
      'an unreferenced manifest entry',
      (prepared: PreparedLegacyPreviewImport, manifest: ReturnType<typeof createManifest>) => {
        manifest.files.push({
          ...manifest.files[0],
          sourcePath: 'public/girls/unreferenced.jpg',
          targetPath: 'casts/gold-main/unreferenced.jpg',
          slot: 3,
        })
        return { prepared, manifest }
      },
      'UNREFERENCED_IMAGE',
    ],
    [
      'a manifest owner that does not exactly match the prepared cast',
      (prepared: PreparedLegacyPreviewImport, manifest: ReturnType<typeof createManifest>) => {
        manifest.files[0].owner.legacyId = 'db_gold.girls:cast-99'
        return { prepared, manifest }
      },
      'IMAGE_OWNER_MISMATCH',
    ],
    [
      'a manifest slot that does not match the cast gallery order',
      (prepared: PreparedLegacyPreviewImport, manifest: ReturnType<typeof createManifest>) => {
        manifest.files[0].slot = 2
        manifest.files[1].slot = 1
        return { prepared, manifest }
      },
      'IMAGE_SLOT_MISMATCH',
    ],
    [
      'a duplicate gallery reference',
      (prepared: PreparedLegacyPreviewImport, manifest: ReturnType<typeof createManifest>) => {
        prepared.records.casts[0].record.images.push(
          '/salon-uploads/casts/gold-main/cast-7/gallery.jpg'
        )
        return { prepared, manifest }
      },
      'DUPLICATE_IMAGE_REFERENCE',
    ],
    [
      'the same image assigned to another cast',
      (prepared: PreparedLegacyPreviewImport, manifest: ReturnType<typeof createManifest>) => {
        prepared.records.casts.push(structuredClone(prepared.records.casts[0]))
        return { prepared, manifest }
      },
      'DUPLICATE_IMAGE_REFERENCE',
    ],
    [
      'a source mismatch',
      (prepared: PreparedLegacyPreviewImport, manifest: ReturnType<typeof createManifest>) => {
        manifest.sourceKey = 'other-source'
        return { prepared, manifest }
      },
      'SOURCE_KEY_MISMATCH',
    ],
    [
      'a cutoff mismatch',
      (prepared: PreparedLegacyPreviewImport, manifest: ReturnType<typeof createManifest>) => {
        manifest.capturedAt = '2026-07-20T01:00:01.000Z'
        return { prepared, manifest }
      },
      'CUTOFF_MISMATCH',
    ],
  ])('rejects %s', (_, mutate, expectedCode) => {
    const { prepared, manifest } = mutate(createPrepared(), createManifest())
    const result = prepareLegacyPreviewImageImport(prepared, manifest)

    expect(result.success).toBe(false)
    if (result.success) throw new Error('Expected image plan rejection')
    expect(result.issues.map((issue) => issue.code)).toContain(expectedCode)
    expect(JSON.stringify(result)).not.toContain('unreferenced.jpg')
    expect(JSON.stringify(result)).not.toContain('gold-main/missing.jpg')
  })

  it.each([
    ['undefined', (prepared: PreparedLegacyPreviewImport) => ({ ...prepared, unsafe: undefined })],
    [
      'non-finite number',
      (prepared: PreparedLegacyPreviewImport) => ({ ...prepared, unsafe: NaN }),
    ],
    [
      'non-plain object',
      (prepared: PreparedLegacyPreviewImport) => ({ ...prepared, unsafe: new Date() }),
    ],
  ])('rejects non-JSON-safe %s before planning', (_, mutate) => {
    const result = prepareLegacyPreviewImageImport(mutate(createPrepared()), createManifest())

    expect(result.success).toBe(false)
    if (result.success) throw new Error('Expected unsafe input rejection')
    expect(result.issues.map((issue) => issue.code)).toContain('INVALID_INPUT')
  })

  it('returns a redacted validation failure for malformed but JSON-safe cast rows', () => {
    const prepared = createPrepared() as unknown as Record<string, unknown>
    const records = prepared.records as Record<string, unknown>
    records.casts = [{ record: null, sourceHash: 'f'.repeat(64) }]

    expect(() => prepareLegacyPreviewImageImport(prepared, createManifest())).not.toThrow()
    const result = prepareLegacyPreviewImageImport(prepared, createManifest())
    expect(result.success).toBe(false)
    if (result.success) throw new Error('Expected malformed input rejection')
    expect(result.issues.map((issue) => issue.code)).toContain('INVALID_INPUT')
  })
})

describe('executeLegacyPreviewImageImport', () => {
  it('copies a standalone validated manifest without requiring canonical-row preparation', async () => {
    const io = createIo()

    const result = await executeVerifiedLegacyPreviewImageCopy(
      createManifest(),
      'gold-main',
      safety,
      io
    )

    expect(result).toEqual(
      expect.objectContaining({
        success: true,
        plannedFileCount: 2,
        createdFileCount: 2,
        reusedFileCount: 0,
      })
    )
    expect(io.copyExclusive).toHaveBeenCalledTimes(2)
  })

  it('verifies all sources, then exclusively creates missing targets', async () => {
    const preparation = prepareLegacyPreviewImageImport(createPrepared(), createManifest())
    if (!preparation.success) throw new Error('Expected image plan')
    const order: string[] = []
    const io = createIo({
      inspectSource: vi.fn().mockImplementation(async (file) => {
        order.push(`source:${file.sha256}`)
        return {
          isFile: true,
          isSymbolicLink: false,
          sizeBytes: file.sizeBytes,
          sha256: file.sha256,
          mediaType: file.mediaType,
          width: file.width,
          height: file.height,
        }
      }),
      copyExclusive: vi.fn().mockImplementation(async (file) => {
        order.push(`copy:${file.sha256}`)
        return {
          isFile: true,
          isSymbolicLink: false,
          sizeBytes: file.sizeBytes,
          sha256: file.sha256,
          mediaType: file.mediaType,
          width: file.width,
          height: file.height,
        }
      }),
    })

    const result = await executeLegacyPreviewImageImport(preparation.plan, safety, io)

    expect(result).toEqual({
      success: true,
      plannedFileCount: 2,
      verifiedByteCount: mainContents.byteLength + galleryContents.byteLength,
      createdFileCount: 2,
      reusedFileCount: 0,
      rolledBackFileCount: 0,
      issues: [],
    })
    expect(order).toEqual([
      `source:${mainHash}`,
      `source:${galleryHash}`,
      `copy:${mainHash}`,
      `copy:${galleryHash}`,
    ])
  })

  it('reuses existing targets only when both size and checksum match', async () => {
    const preparation = prepareLegacyPreviewImageImport(createPrepared(), createManifest())
    if (!preparation.success) throw new Error('Expected image plan')
    const copyExclusive = vi.fn()
    const io = createIo({
      inspectTargetInventory: vi
        .fn()
        .mockResolvedValue(preparation.plan.files.map(({ targetPath }) => targetPath)),
      inspectTarget: vi.fn().mockImplementation(async (file) => ({
        isFile: true,
        isSymbolicLink: false,
        sizeBytes: file.sizeBytes,
        sha256: file.sha256,
        mediaType: file.mediaType,
        width: file.width,
        height: file.height,
      })),
      copyExclusive,
    })

    const result = await executeLegacyPreviewImageImport(preparation.plan, safety, io)

    expect(result.success).toBe(true)
    expect(result.reusedFileCount).toBe(2)
    expect(result.createdFileCount).toBe(0)
    expect(copyExclusive).not.toHaveBeenCalled()
  })

  it('rejects a partial or unplanned target inventory before inspecting source files', async () => {
    const preparation = prepareLegacyPreviewImageImport(createPrepared(), createManifest())
    if (!preparation.success) throw new Error('Expected image plan')
    const inspectSource = vi.fn()
    const copyExclusive = vi.fn()
    const io = createIo({
      inspectTargetInventory: vi.fn().mockResolvedValue([preparation.plan.files[0].targetPath]),
      inspectSource,
      copyExclusive,
    })

    const result = await executeLegacyPreviewImageImport(preparation.plan, safety, io)

    expect(result.success).toBe(false)
    expect(result.issues.map((issue) => issue.code)).toEqual(['TARGET_INVENTORY_CONFLICT'])
    expect(inspectSource).not.toHaveBeenCalled()
    expect(copyExclusive).not.toHaveBeenCalled()
  })

  it('treats an unreadable target inventory as unknown residual state', async () => {
    const preparation = prepareLegacyPreviewImageImport(createPrepared(), createManifest())
    if (!preparation.success) throw new Error('Expected image plan')
    const inspectSource = vi.fn()
    const io = createIo({
      inspectTargetInventory: vi
        .fn()
        .mockRejectedValue(new Error('/srv/private target inventory failed')),
      inspectSource,
    })

    const result = await executeLegacyPreviewImageImport(preparation.plan, safety, io)

    expect(result.success).toBe(false)
    expect(result.issues.map((issue) => issue.code)).toEqual(['TARGET_INVENTORY_INSPECTION_FAILED'])
    expect(inspectSource).not.toHaveBeenCalled()
    expect(JSON.stringify(result)).not.toContain('/srv/private')
  })

  it('performs no target writes when any source or existing target fails verification', async () => {
    const preparation = prepareLegacyPreviewImageImport(createPrepared(), createManifest())
    if (!preparation.success) throw new Error('Expected image plan')
    const copyExclusive = vi.fn()
    const sourceFailure = await executeLegacyPreviewImageImport(
      preparation.plan,
      safety,
      createIo({
        inspectSource: vi
          .fn()
          .mockResolvedValueOnce({
            isFile: true,
            isSymbolicLink: false,
            sizeBytes: mainContents.byteLength,
            sha256: mainHash,
            mediaType: 'image/jpeg',
            width: 800,
            height: 1200,
          })
          .mockResolvedValueOnce({
            isFile: true,
            isSymbolicLink: false,
            sizeBytes: galleryContents.byteLength,
            sha256: 'f'.repeat(64),
            mediaType: 'image/jpeg',
            width: 900,
            height: 1200,
          }),
        copyExclusive,
      })
    )
    const targetFailure = await executeLegacyPreviewImageImport(
      preparation.plan,
      safety,
      createIo({
        inspectTarget: vi
          .fn()
          .mockResolvedValueOnce({
            isFile: true,
            isSymbolicLink: false,
            sizeBytes: mainContents.byteLength,
            sha256: 'f'.repeat(64),
            mediaType: 'image/jpeg',
            width: 800,
            height: 1200,
          })
          .mockResolvedValueOnce(null),
        copyExclusive,
      })
    )

    expect(sourceFailure).toMatchObject({ success: false, createdFileCount: 0 })
    expect(targetFailure).toMatchObject({ success: false, createdFileCount: 0 })
    expect(copyExclusive).not.toHaveBeenCalled()
  })

  it('rolls back only files created by this run when a later exclusive copy fails', async () => {
    const preparation = prepareLegacyPreviewImageImport(createPrepared(), createManifest())
    if (!preparation.success) throw new Error('Expected image plan')
    const rollbackCreated = vi.fn().mockResolvedValue(undefined)
    const io = createIo({
      copyExclusive: vi
        .fn()
        .mockResolvedValueOnce({
          isFile: true,
          isSymbolicLink: false,
          sizeBytes: mainContents.byteLength,
          sha256: mainHash,
          mediaType: 'image/jpeg',
          width: 800,
          height: 1200,
        })
        .mockRejectedValueOnce(new Error('secret target path /srv/private/gallery.jpg')),
      rollbackCreated,
    })

    const result = await executeLegacyPreviewImageImport(preparation.plan, safety, io)

    expect(result).toMatchObject({
      success: false,
      createdFileCount: 0,
      reusedFileCount: 0,
      rolledBackFileCount: 1,
    })
    expect(rollbackCreated).toHaveBeenCalledTimes(1)
    expect(JSON.stringify(result)).not.toContain('/srv/private')
    expect(JSON.stringify(result)).not.toContain('gallery.jpg')
  })

  it('marks residual state when a failed exclusive copy leaves a target behind', async () => {
    const preparation = prepareLegacyPreviewImageImport(createPrepared(), createManifest())
    if (!preparation.success) throw new Error('Expected image plan')
    const inspectTarget = vi
      .fn()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockImplementation(async (file) => ({
        isFile: true,
        isSymbolicLink: false,
        sizeBytes: file.sizeBytes,
        sha256: file.sha256,
        mediaType: file.mediaType,
        width: file.width,
        height: file.height,
      }))
    const io = createIo({
      inspectTarget,
      copyExclusive: vi.fn().mockRejectedValue(new Error('copy cleanup failed')),
    })

    const result = await executeLegacyPreviewImageImport(preparation.plan, safety, io)

    expect(result).toMatchObject({
      success: false,
      createdFileCount: 0,
      rolledBackFileCount: 0,
    })
    expect(result.issues.map((issue) => issue.code)).toEqual(['COPY_FAILED', 'ROLLBACK_FAILED'])
    expect(inspectTarget).toHaveBeenCalledTimes(3)
  })

  it('rejects an unguarded target identity before reading or writing image files', async () => {
    const preparation = prepareLegacyPreviewImageImport(createPrepared(), createManifest())
    if (!preparation.success) throw new Error('Expected image plan')
    const inspectSource = vi.fn()
    const copyExclusive = vi.fn()
    const io = createIo({
      inspectTargetIdentity: vi.fn().mockResolvedValue({
        realRoot: '/srv/salon-preview-storage/images',
        environment: 'production',
        targetId: 'preview-target-20260720',
      }),
      inspectSource,
      copyExclusive,
    })

    const result = await executeLegacyPreviewImageImport(preparation.plan, safety, io)

    expect(result.success).toBe(false)
    expect(inspectSource).not.toHaveBeenCalled()
    expect(copyExclusive).not.toHaveBeenCalled()
  })

  it('rejects a plan whose manifest files were changed after preparation', async () => {
    const preparation = prepareLegacyPreviewImageImport(createPrepared(), createManifest())
    if (!preparation.success) throw new Error('Expected image plan')
    preparation.plan.files[0].targetPath = 'casts/gold-main/cast-7/tampered.jpg'
    const inspectTargetIdentity = vi.fn()

    const result = await executeLegacyPreviewImageImport(
      preparation.plan,
      safety,
      createIo({ inspectTargetIdentity })
    )

    expect(result.issues.map((issue) => issue.code)).toEqual(['INVALID_INPUT'])
    expect(inspectTargetIdentity).not.toHaveBeenCalled()
  })

  it('reports a residual created file when safe rollback itself fails', async () => {
    const preparation = prepareLegacyPreviewImageImport(createPrepared(), createManifest())
    if (!preparation.success) throw new Error('Expected image plan')
    const io = createIo({
      copyExclusive: vi
        .fn()
        .mockResolvedValueOnce({
          isFile: true,
          isSymbolicLink: false,
          sizeBytes: mainContents.byteLength,
          sha256: mainHash,
          mediaType: 'image/jpeg',
          width: 800,
          height: 1200,
        })
        .mockRejectedValueOnce(new Error('copy failed')),
      rollbackCreated: vi.fn().mockRejectedValue(new Error('rollback failed')),
    })

    const result = await executeLegacyPreviewImageImport(preparation.plan, safety, io)

    expect(result).toMatchObject({
      success: false,
      createdFileCount: 1,
      rolledBackFileCount: 0,
    })
    expect(result.issues.map((issue) => issue.code)).toEqual(['COPY_FAILED', 'ROLLBACK_FAILED'])
  })
})
