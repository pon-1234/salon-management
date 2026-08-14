/**
 * @design_doc   docs/LEGACY_DATA_MIGRATION_RUNBOOK.md reproducible Ikebukuro image package
 * @related_to   gold-master-images.ts builds the manifest; preview-image-filesystem.ts inspects bytes safely
 * @known_issues This command reads a locally acquired public-image package and never contacts production
 */
import { mkdtemp, realpath, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { isAbsolute, join } from 'node:path'
import { pathToFileURL } from 'node:url'

import { createLegacyPreviewImageFilesystemIo } from '@/lib/migration/legacy/preview-image-filesystem'
import { readPrivateLegacyJsonText } from '@/lib/migration/legacy/private-json-file'
import { parseStrictJson } from '@/lib/migration/legacy/strict-json'
import { projectGoldMasterPreviewImages } from '@/lib/preview-uat/gold-master-fixture'
import {
  GOLD_MASTER_IMAGE_PHYSICAL_TABLE,
  GOLD_MASTER_IMAGE_SOURCE_KEY,
  buildGoldMasterPreviewImageManifest,
} from '@/lib/preview-uat/gold-master-images'

const MAXIMUM_SNAPSHOT_BYTES = 128 * 1024 * 1024

interface GoldMasterImageManifestBuildDependencies {
  readSnapshot(path: string): Promise<unknown>
  buildManifest(snapshot: unknown, sourceRoot: string): Promise<unknown>
  writeOutput(message: string): void
  writeError(message: string): void
}

class GoldMasterImageManifestConfigError extends Error {
  constructor() {
    super('GOLD_MASTER_IMAGE_MANIFEST_CONFIG_REJECTED')
    this.name = 'GoldMasterImageManifestConfigError'
  }
}

const defaultDependencies: GoldMasterImageManifestBuildDependencies = {
  async readSnapshot(path) {
    const text = await readPrivateLegacyJsonText(path, MAXIMUM_SNAPSHOT_BYTES)
    return parseStrictJson(text, MAXIMUM_SNAPSHOT_BYTES)
  },
  async buildManifest(snapshot, sourceRoot) {
    const createdInspectionTarget = await mkdtemp(join(tmpdir(), 'salon-preview-image-inspection-'))
    try {
      const inspectionTarget = await realpath(createdInspectionTarget)
      const io = createLegacyPreviewImageFilesystemIo({
        sourceRoot,
        targetRoot: inspectionTarget,
      })
      return await buildGoldMasterPreviewImageManifest(
        projectGoldMasterPreviewImages(snapshot),
        (sourcePath) =>
          io.inspectSource({
            sourcePath,
            targetPath: 'casts/inspection/placeholder.jpg',
            owner: {
              sourceKey: GOLD_MASTER_IMAGE_SOURCE_KEY,
              entity: 'casts',
              physicalTable: GOLD_MASTER_IMAGE_PHYSICAL_TABLE,
              legacyId: `${GOLD_MASTER_IMAGE_PHYSICAL_TABLE}:inspection`,
            },
            slot: 1,
            mediaType: 'image/jpeg',
            width: 1,
            height: 1,
            sha256: '0'.repeat(64),
            sizeBytes: 0,
            visibility: 'public',
          })
      )
    } finally {
      await rm(createdInspectionTarget, { recursive: true, force: true })
    }
  },
  writeOutput: (message) => process.stdout.write(message),
  writeError: (message) => console.error(message),
}

function parseArguments(argv: string[]): { snapshotPath: string; sourceRoot: string } {
  const normalized = argv[0] === '--' ? argv.slice(1) : argv
  if (
    normalized.length !== 4 ||
    normalized[0] !== '--snapshot' ||
    !normalized[1] ||
    !isAbsolute(normalized[1]) ||
    !normalized[1].endsWith('.json') ||
    normalized[2] !== '--source-root' ||
    !normalized[3] ||
    !isAbsolute(normalized[3])
  ) {
    throw new GoldMasterImageManifestConfigError()
  }
  return { snapshotPath: normalized[1], sourceRoot: normalized[3] }
}

/** Builds one strict manifest without exposing source rows or file contents on stdout. */
export async function runGoldMasterImageManifestBuild(
  argv: string[],
  dependencies: GoldMasterImageManifestBuildDependencies = defaultDependencies
): Promise<number> {
  try {
    const args = parseArguments(argv)
    const snapshot = await dependencies.readSnapshot(args.snapshotPath)
    const manifest = await dependencies.buildManifest(snapshot, args.sourceRoot)
    dependencies.writeOutput(`${JSON.stringify(manifest)}\n`)
    return 0
  } catch (error) {
    const code =
      error instanceof GoldMasterImageManifestConfigError
        ? error.message
        : 'GOLD_MASTER_IMAGE_MANIFEST_REJECTED'
    dependencies.writeError(`Gold master image manifest failed: ${code}`)
    return 1
  }
}

const executedPath = process.argv[1]
if (executedPath && import.meta.url === pathToFileURL(executedPath).href) {
  void runGoldMasterImageManifestBuild(process.argv.slice(2)).then((code) => {
    process.exitCode = code
  })
}
