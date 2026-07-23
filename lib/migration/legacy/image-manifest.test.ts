/**
 * @design_doc   docs/LEGACY_DATA_MIGRATION_RUNBOOK.md offline preview image verification
 * @related_to   image-manifest.ts validates copied image packages before preview storage writes
 * @known_issues Version 1 supports public cast images only; private legacy assets remain blocked
 */
import { describe, expect, it, vi } from 'vitest'
import { validateLegacyImageManifest, verifyLegacyImageSnapshot } from './image-manifest'

const hash = 'a'.repeat(64)
const validManifest = {
  version: 1,
  sourceKey: 'gold-main',
  capturedAt: '2026-07-20T01:00:00.000Z',
  files: [
    {
      sourcePath: 'public/girls/cast-1/main.jpg',
      targetPath: 'casts/gold-main/cast-1/main.jpg',
      owner: {
        sourceKey: 'gold-main',
        entity: 'casts',
        physicalTable: 'db_gold.girls',
        legacyId: 'db_gold.girls:cast-1',
      },
      slot: 1,
      mediaType: 'image/jpeg',
      width: 800,
      height: 1200,
      sha256: hash,
      sizeBytes: 1234,
      visibility: 'public',
    },
  ],
}

describe('validateLegacyImageManifest', () => {
  it('accepts an exact versioned public-image manifest', () => {
    expect(validateLegacyImageManifest(validManifest, 'gold-main')).toEqual({
      success: true,
      data: validManifest,
      issues: [],
    })
  })

  it.each([
    ['absolute source', { sourcePath: '/etc/passwd' }],
    ['source traversal', { sourcePath: '../secret.jpg' }],
    ['target traversal', { targetPath: 'casts/../../secret.jpg' }],
    ['target query', { targetPath: 'casts/cast.jpg?download=1' }],
    ['target escaped segment', { targetPath: 'casts/%2e%2e/secret.jpg' }],
    ['target whitespace', { targetPath: 'casts/cast photo.jpg' }],
    ['backslash path', { sourcePath: 'public\\girls\\cast.jpg' }],
    ['wrong target namespace', { targetPath: 'admin/private.jpg' }],
    ['missing owner', { owner: undefined }],
    ['wrong owner source', { owner: { ...validManifest.files[0].owner, sourceKey: 'other' } }],
    ['wrong owner entity', { owner: { ...validManifest.files[0].owner, entity: 'customers' } }],
    [
      'unqualified owner table',
      { owner: { ...validManifest.files[0].owner, physicalTable: 'girls' } },
    ],
    ['invalid owner ID', { owner: { ...validManifest.files[0].owner, legacyId: 'cast-1' } }],
    ['slot below range', { slot: 0 }],
    ['slot above range', { slot: 16 }],
    ['unsupported media type', { mediaType: 'image/svg+xml' }],
    ['media extension mismatch', { mediaType: 'image/png' }],
    ['invalid width', { width: 0 }],
    ['invalid height', { height: -1 }],
    ['private image', { visibility: 'private' }],
    ['invalid digest', { sha256: 'abc' }],
    ['invalid size', { sizeBytes: -1 }],
  ])('rejects an unsafe %s', (_, override) => {
    const result = validateLegacyImageManifest(
      {
        ...validManifest,
        files: [{ ...validManifest.files[0], ...override }],
      },
      'gold-main'
    )

    expect(result.success).toBe(false)
  })

  it('rejects source-key mismatch, unknown fields, and duplicate target paths', () => {
    const result = validateLegacyImageManifest(
      {
        ...validManifest,
        unexpected: true,
        files: [
          validManifest.files[0],
          {
            ...validManifest.files[0],
            sourcePath: 'public/girls/cast-2/main.jpg',
          },
        ],
      },
      'different-source'
    )

    expect(result.success).toBe(false)
    if (result.success) throw new Error('Expected validation failure')
    expect(result.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining(['SOURCE_KEY_MISMATCH', 'UNSUPPORTED_FIELD', 'DUPLICATE_TARGET_PATH'])
    )
  })

  it('rejects duplicate slots for the same explicit cast owner', () => {
    const result = validateLegacyImageManifest(
      {
        ...validManifest,
        files: [
          validManifest.files[0],
          {
            ...validManifest.files[0],
            sourcePath: 'public/girls/cast-1/other.jpg',
            targetPath: 'casts/gold-main/cast-1/other.jpg',
          },
        ],
      },
      'gold-main'
    )

    expect(result.success).toBe(false)
    if (result.success) throw new Error('Expected validation failure')
    expect(result.issues.map((issue) => issue.code)).toContain('DUPLICATE_OWNER_SLOT')
  })
})

describe('verifyLegacyImageSnapshot', () => {
  it('verifies every regular non-symlink file before returning a redacted summary', async () => {
    const inspectFile = vi.fn().mockResolvedValue({
      isFile: true,
      isSymbolicLink: false,
      sizeBytes: 1234,
      sha256: hash,
      mediaType: 'image/jpeg',
      width: 800,
      height: 1200,
    })

    const result = await verifyLegacyImageSnapshot(validManifest, 'gold-main', { inspectFile })

    expect(result).toEqual({
      success: true,
      verifiedFileCount: 1,
      verifiedByteCount: 1234,
      issues: [],
    })
    expect(inspectFile).toHaveBeenCalledWith('public/girls/cast-1/main.jpg')
  })

  it.each([
    [
      'missing/non-file',
      {
        isFile: false,
        isSymbolicLink: false,
        sizeBytes: 1234,
        sha256: hash,
        mediaType: null,
        width: null,
        height: null,
      },
    ],
    [
      'symbolic link',
      {
        isFile: true,
        isSymbolicLink: true,
        sizeBytes: 1234,
        sha256: hash,
        mediaType: null,
        width: null,
        height: null,
      },
    ],
    [
      'size mismatch',
      {
        isFile: true,
        isSymbolicLink: false,
        sizeBytes: 9,
        sha256: hash,
        mediaType: 'image/jpeg',
        width: 800,
        height: 1200,
      },
    ],
    [
      'checksum mismatch',
      {
        isFile: true,
        isSymbolicLink: false,
        sizeBytes: 1234,
        sha256: 'b'.repeat(64),
        mediaType: 'image/jpeg',
        width: 800,
        height: 1200,
      },
    ],
    [
      'media type mismatch',
      {
        isFile: true,
        isSymbolicLink: false,
        sizeBytes: 1234,
        sha256: hash,
        mediaType: 'image/png',
        width: 800,
        height: 1200,
      },
    ],
    [
      'dimension mismatch',
      {
        isFile: true,
        isSymbolicLink: false,
        sizeBytes: 1234,
        sha256: hash,
        mediaType: 'image/jpeg',
        width: 801,
        height: 1200,
      },
    ],
  ])('fails the complete package for a %s without returning file paths', async (_, inspection) => {
    const result = await verifyLegacyImageSnapshot(validManifest, 'gold-main', {
      inspectFile: vi.fn().mockResolvedValue(inspection),
    })

    expect(result.success).toBe(false)
    expect(result.verifiedFileCount).toBe(0)
    expect(result.verifiedByteCount).toBe(0)
    expect(JSON.stringify(result)).not.toContain('cast-1')
    expect(JSON.stringify(result)).not.toContain('public/girls')
  })

  it('returns validation issues without touching the filesystem', async () => {
    const inspectFile = vi.fn()
    const result = await verifyLegacyImageSnapshot(
      { ...validManifest, files: [{ ...validManifest.files[0], sourcePath: '../secret' }] },
      'gold-main',
      { inspectFile }
    )

    expect(result.success).toBe(false)
    expect(inspectFile).not.toHaveBeenCalled()
  })
})
