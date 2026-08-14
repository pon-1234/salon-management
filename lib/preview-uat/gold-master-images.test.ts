/**
 * @design_doc   docs/LEGACY_DATA_MIGRATION_RUNBOOK.md verified Ikebukuro image package
 * @related_to   gold-master-images.ts binds each V3 photo slot to one verified storage object
 * @known_issues The package covers public cast photos only; private legacy assets remain excluded
 */
import { describe, expect, it } from 'vitest'

import {
  GOLD_MASTER_IMAGE_PHYSICAL_TABLE,
  GOLD_MASTER_IMAGE_SOURCE_KEY,
  GoldMasterPreviewImageError,
  buildGoldMasterPreviewImageManifest,
  prepareGoldMasterPreviewImages,
  type GoldMasterPreviewImageProjection,
} from './gold-master-images'

const cutoffAt = '2026-07-20T04:00:00.000Z'
const projection: GoldMasterPreviewImageProjection = {
  cutoffAt,
  references: [
    { girlNo: 56019, slot: 1, fileName: 'main.jpg' },
    { girlNo: 56019, slot: 3, fileName: 'third.png' },
  ],
}

function manifest() {
  return {
    version: 1,
    sourceKey: GOLD_MASTER_IMAGE_SOURCE_KEY,
    capturedAt: cutoffAt,
    files: [
      {
        sourcePath: '56019/main.jpg',
        targetPath: 'casts/ikebukuro/legacy-cast-56019/01-aaaaaaaaaaaaaaaa.jpg',
        owner: {
          sourceKey: GOLD_MASTER_IMAGE_SOURCE_KEY,
          entity: 'casts',
          physicalTable: GOLD_MASTER_IMAGE_PHYSICAL_TABLE,
          legacyId: `${GOLD_MASTER_IMAGE_PHYSICAL_TABLE}:56019`,
        },
        slot: 1,
        mediaType: 'image/jpeg',
        width: 800,
        height: 1200,
        sha256: 'a'.repeat(64),
        sizeBytes: 1234,
        visibility: 'public',
      },
      {
        sourcePath: '56019/third.png',
        targetPath: 'casts/ikebukuro/legacy-cast-56019/03-bbbbbbbbbbbbbbbb.png',
        owner: {
          sourceKey: GOLD_MASTER_IMAGE_SOURCE_KEY,
          entity: 'casts',
          physicalTable: GOLD_MASTER_IMAGE_PHYSICAL_TABLE,
          legacyId: `${GOLD_MASTER_IMAGE_PHYSICAL_TABLE}:56019`,
        },
        slot: 3,
        mediaType: 'image/png',
        width: 900,
        height: 1300,
        sha256: 'b'.repeat(64),
        sizeBytes: 2345,
        visibility: 'public',
      },
    ],
  }
}

describe('prepareGoldMasterPreviewImages', () => {
  it('builds canonical manifest targets from inspected source bytes', async () => {
    const inspectFile = async (sourcePath: string) => ({
      isFile: true,
      isSymbolicLink: false,
      sizeBytes: sourcePath.endsWith('.jpg') ? 1234 : 2345,
      sha256: sourcePath.endsWith('.jpg') ? 'a'.repeat(64) : 'b'.repeat(64),
      mediaType: sourcePath.endsWith('.jpg') ? ('image/jpeg' as const) : ('image/png' as const),
      width: sourcePath.endsWith('.jpg') ? 800 : 900,
      height: sourcePath.endsWith('.jpg') ? 1200 : 1300,
    })

    await expect(buildGoldMasterPreviewImageManifest(projection, inspectFile)).resolves.toEqual(
      manifest()
    )
  })

  it('creates an integrity-checked copy plan and exact slot URL resolver', () => {
    const prepared = prepareGoldMasterPreviewImages(projection, manifest())

    expect(prepared.plan.files).toHaveLength(2)
    expect(prepared.resolveImageUrl(projection.references[0])).toBe(
      '/salon-uploads/casts/ikebukuro/legacy-cast-56019/01-aaaaaaaaaaaaaaaa.jpg'
    )
    expect(prepared.resolveImageUrl(projection.references[1])).toBe(
      '/salon-uploads/casts/ikebukuro/legacy-cast-56019/03-bbbbbbbbbbbbbbbb.png'
    )
  })

  it.each([
    [
      'missing entry',
      (value: ReturnType<typeof manifest>) => {
        value.files.pop()
      },
    ],
    [
      'unexpected slot',
      (value: ReturnType<typeof manifest>) => {
        value.files[1].slot = 2
      },
    ],
    [
      'wrong source path',
      (value: ReturnType<typeof manifest>) => {
        value.files[0].sourcePath = '56019/other.jpg'
      },
    ],
    [
      'wrong owner',
      (value: ReturnType<typeof manifest>) => {
        value.files[0].owner.legacyId = `${GOLD_MASTER_IMAGE_PHYSICAL_TABLE}:99999`
      },
    ],
    [
      'wrong cutoff',
      (value: ReturnType<typeof manifest>) => {
        value.capturedAt = '2026-07-20T04:00:01.000Z'
      },
    ],
  ])('rejects a manifest with %s', (_label, mutate) => {
    const unsafe = manifest()
    mutate(unsafe)

    expect(() => prepareGoldMasterPreviewImages(projection, unsafe)).toThrow(
      GoldMasterPreviewImageError
    )
  })
})
