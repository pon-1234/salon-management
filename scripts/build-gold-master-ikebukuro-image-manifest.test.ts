/**
 * @design_doc   docs/LEGACY_DATA_MIGRATION_RUNBOOK.md reproducible image-manifest command
 * @related_to   build-gold-master-ikebukuro-image-manifest.ts inspects only the approved package root
 * @known_issues The test injects file inspection and never reads production image bytes
 */
import { describe, expect, it, vi } from 'vitest'

import { runGoldMasterImageManifestBuild } from './build-gold-master-ikebukuro-image-manifest'

const snapshotPath = '/private/ikebukuro-preview.json'
const sourceRoot = '/private/ikebukuro-preview-images'

describe('runGoldMasterImageManifestBuild', () => {
  it('rejects unsafe arguments before reading the private snapshot', async () => {
    const readSnapshot = vi.fn()
    const writeError = vi.fn()

    await expect(
      runGoldMasterImageManifestBuild([], {
        readSnapshot,
        buildManifest: vi.fn(),
        writeOutput: vi.fn(),
        writeError,
      })
    ).resolves.toBe(1)

    expect(readSnapshot).not.toHaveBeenCalled()
    expect(writeError).toHaveBeenCalledWith(
      'Gold master image manifest failed: GOLD_MASTER_IMAGE_MANIFEST_CONFIG_REJECTED'
    )
  })

  it('writes only the strict manifest JSON after inspecting the approved root', async () => {
    const snapshot = { private: 'not-output' }
    const manifest = {
      version: 1,
      sourceKey: 'gold-master-ikebukuro-5600',
      capturedAt: '2026-07-20T04:00:00.000Z',
      files: [],
    }
    const buildManifest = vi.fn(async () => manifest)
    const writeOutput = vi.fn()

    await expect(
      runGoldMasterImageManifestBuild(['--snapshot', snapshotPath, '--source-root', sourceRoot], {
        readSnapshot: vi.fn(async () => snapshot),
        buildManifest,
        writeOutput,
        writeError: vi.fn(),
      })
    ).resolves.toBe(0)

    expect(buildManifest).toHaveBeenCalledWith(snapshot, sourceRoot)
    expect(writeOutput).toHaveBeenCalledWith(`${JSON.stringify(manifest)}\n`)
    expect(JSON.stringify(writeOutput.mock.calls)).not.toContain('not-output')
  })
})
