/**
 * @design_doc   docs/PREVIEW_UAT_CHECKLIST.md guarded sanitized Ikebukuro import command
 * @related_to   lib/preview-uat/gold-master-fixture.ts and prisma-adapter.ts
 * @known_issues The source snapshot is a non-atomic UAT projection and cannot authorize cutover
 */
import { randomBytes } from 'node:crypto'
import { isAbsolute } from 'node:path'
import { pathToFileURL } from 'node:url'

import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'

import { createLegacyPreviewImageFilesystemIo } from '@/lib/migration/legacy/preview-image-filesystem'
import {
  executeVerifiedLegacyPreviewImageCopy,
  type LegacyPreviewImageImportIo,
  type LegacyPreviewImageImportReport,
} from '@/lib/migration/legacy/preview-image-import'
import { LEGACY_PREVIEW_ACKNOWLEDGEMENT } from '@/lib/migration/legacy/preview-safety'
import { readPrivateLegacyJsonText } from '@/lib/migration/legacy/private-json-file'
import { parseStrictJson } from '@/lib/migration/legacy/strict-json'
import {
  GoldMasterPreviewError,
  buildGoldMasterPreviewFixture,
  projectGoldMasterPreviewImages,
} from '@/lib/preview-uat/gold-master-fixture'
import {
  GOLD_MASTER_IMAGE_SOURCE_KEY,
  GoldMasterPreviewImageError,
  prepareGoldMasterPreviewImages,
  type PreparedGoldMasterPreviewImages,
} from '@/lib/preview-uat/gold-master-images'
import { createPrismaPreviewUatDatabase } from '@/lib/preview-uat/prisma-adapter'
import {
  PREVIEW_UAT_ACKNOWLEDGEMENT,
  PreviewUatSetupError,
  assertPreviewUatTargetIdentity,
  parsePreviewUatSetupConfig,
  type PreviewUatDatabase,
} from '@/lib/preview-uat/setup'

export const GOLD_MASTER_PREVIEW_ACKNOWLEDGEMENT =
  'CREATE_SANITIZED_IKEBUKURO_SNAPSHOT_IN_EMPTY_ISOLATED_PREVIEW'

const MAXIMUM_SNAPSHOT_BYTES = 128 * 1024 * 1024
const MAXIMUM_IMAGE_MANIFEST_BYTES = 16 * 1024 * 1024

interface GoldMasterPreviewRunnerDependencies {
  readSnapshot(path: string): Promise<unknown>
  readImageManifest(path: string): Promise<unknown>
  prepareImages(
    projection: ReturnType<typeof projectGoldMasterPreviewImages>,
    manifest: unknown
  ): PreparedGoldMasterPreviewImages
  createImageFilesystem(sourceRoot: string, targetRoot: string): LegacyPreviewImageImportIo
  copyImages(
    manifest: unknown,
    expectedSourceKey: string,
    safety: Parameters<typeof executeVerifiedLegacyPreviewImageCopy>[2],
    io: LegacyPreviewImageImportIo
  ): Promise<LegacyPreviewImageImportReport>
  createDatabase(databaseUrl: string): PreviewUatDatabase
  generateDisabledPassword(): string
  hashPassword(password: string): Promise<string>
  writeOutput(message: string): void
  writeError(message: string): void
}

type GoldMasterPreviewEnvironment = Record<string, string | undefined>

class GoldMasterPreviewConfigError extends Error {
  constructor() {
    super('GOLD_MASTER_PREVIEW_CONFIG_REJECTED')
    this.name = 'GoldMasterPreviewConfigError'
  }
}

class GoldMasterPreviewImageImportError extends Error {
  constructor(code = 'GOLD_MASTER_PREVIEW_IMAGE_IMPORT_FAILED') {
    super(code)
    this.name = 'GoldMasterPreviewImageImportError'
  }
}

const defaultDependencies: GoldMasterPreviewRunnerDependencies = {
  async readSnapshot(path) {
    const text = await readPrivateLegacyJsonText(path, MAXIMUM_SNAPSHOT_BYTES)
    return parseStrictJson(text, MAXIMUM_SNAPSHOT_BYTES)
  },
  async readImageManifest(path) {
    const text = await readPrivateLegacyJsonText(path, MAXIMUM_IMAGE_MANIFEST_BYTES)
    return parseStrictJson(text, MAXIMUM_IMAGE_MANIFEST_BYTES)
  },
  prepareImages: prepareGoldMasterPreviewImages,
  createImageFilesystem: (sourceRoot, targetRoot) =>
    createLegacyPreviewImageFilesystemIo({ sourceRoot, targetRoot }),
  copyImages: executeVerifiedLegacyPreviewImageCopy,
  createDatabase: (databaseUrl) =>
    createPrismaPreviewUatDatabase(
      new PrismaClient({
        datasources: { db: { url: databaseUrl } },
      })
    ),
  generateDisabledPassword: () => randomBytes(32).toString('base64url'),
  hashPassword: (password) => hash(password, 12),
  writeOutput: (message) => console.log(message),
  writeError: (message) => console.error(message),
}

interface GoldMasterPreviewArguments {
  snapshotPath: string
  imageManifestPath: string
  imageSourceRoot: string
  imageTargetRoot: string
}

function parseArguments(argv: string[]): GoldMasterPreviewArguments {
  const normalizedArguments = argv[0] === '--' ? argv.slice(1) : argv
  if (
    normalizedArguments.length !== 10 ||
    normalizedArguments[0] !== '--snapshot' ||
    !normalizedArguments[1] ||
    !isAbsolute(normalizedArguments[1]) ||
    !normalizedArguments[1].endsWith('.json') ||
    normalizedArguments[2] !== '--image-manifest' ||
    !normalizedArguments[3] ||
    !isAbsolute(normalizedArguments[3]) ||
    !normalizedArguments[3].endsWith('.json') ||
    normalizedArguments[4] !== '--image-source-root' ||
    !normalizedArguments[5] ||
    !isAbsolute(normalizedArguments[5]) ||
    normalizedArguments[6] !== '--image-target-root' ||
    !normalizedArguments[7] ||
    !isAbsolute(normalizedArguments[7]) ||
    normalizedArguments[8] !== '--ack' ||
    normalizedArguments[9] !== GOLD_MASTER_PREVIEW_ACKNOWLEDGEMENT
  ) {
    throw new GoldMasterPreviewConfigError()
  }
  return {
    snapshotPath: normalizedArguments[1],
    imageManifestPath: normalizedArguments[3],
    imageSourceRoot: normalizedArguments[5],
    imageTargetRoot: normalizedArguments[7],
  }
}

function failureCode(error: unknown): string {
  if (error instanceof GoldMasterPreviewConfigError) return error.message
  if (error instanceof GoldMasterPreviewError) return error.message
  if (error instanceof GoldMasterPreviewImageError) return error.message
  if (error instanceof GoldMasterPreviewImageImportError) return error.message
  if (error instanceof PreviewUatSetupError) return error.code
  return 'GOLD_MASTER_PREVIEW_IMPORT_FAILED'
}

/** Imports one validated snapshot into an empty marked preview DB without exposing source rows. */
export async function runGoldMasterPreviewImport(
  argv: string[],
  environment: GoldMasterPreviewEnvironment,
  dependencies: GoldMasterPreviewRunnerDependencies = defaultDependencies
): Promise<number> {
  let database: PreviewUatDatabase | undefined
  let preparedImages: PreparedGoldMasterPreviewImages | undefined
  let imageIo: LegacyPreviewImageImportIo | undefined
  let imageReport: LegacyPreviewImageImportReport | undefined
  let exitCode = 1

  try {
    const args = parseArguments(argv)
    const config = parsePreviewUatSetupConfig(['--ack', PREVIEW_UAT_ACKNOWLEDGEMENT], environment)
    const [snapshot, imageManifest] = await Promise.all([
      dependencies.readSnapshot(args.snapshotPath),
      dependencies.readImageManifest(args.imageManifestPath),
    ])
    preparedImages = dependencies.prepareImages(
      projectGoldMasterPreviewImages(snapshot),
      imageManifest
    )
    imageIo = dependencies.createImageFilesystem(args.imageSourceRoot, args.imageTargetRoot)
    imageReport = await dependencies.copyImages(
      preparedImages.plan,
      GOLD_MASTER_IMAGE_SOURCE_KEY,
      {
        runtimeMode: environment.APP_RUNTIME_MODE,
        outboundDeliveryMode: environment.OUTBOUND_DELIVERY_MODE,
        targetRoot: args.imageTargetRoot,
        expectedTargetRoot: environment.PREVIEW_IMAGE_TARGET_ROOT,
        configuredTargetId: environment.PREVIEW_TARGET_ID,
        confirmedTargetId: environment.PREVIEW_TARGET_ID,
        acknowledgement: LEGACY_PREVIEW_ACKNOWLEDGEMENT,
      },
      imageIo
    )
    if (!imageReport.success) throw new GoldMasterPreviewImageImportError()

    const passwordHashes = {
      admin: await dependencies.hashPassword(config.passwords.admin),
      customer: await dependencies.hashPassword(config.passwords.customer),
      customerDisabled: await dependencies.hashPassword(dependencies.generateDisabledPassword()),
      cast: await dependencies.hashPassword(config.passwords.cast),
    }
    const fixture = buildGoldMasterPreviewFixture(snapshot, {
      passwordHashes,
      resolveImageUrl: preparedImages.resolveImageUrl,
    })
    const expectedIdentity = {
      databaseName: config.databaseName,
      environment: 'staging-preview',
      marker: config.marker,
    }

    database = dependencies.createDatabase(config.databaseUrl)
    const actualIdentity = await database.readTargetIdentity()
    assertPreviewUatTargetIdentity(actualIdentity, expectedIdentity)
    const summary = await database.createSyntheticFixture(expectedIdentity, fixture)
    dependencies.writeOutput(
      `Gold master preview imported: stores=${summary.stores} admins=${summary.admins} customers=${summary.customers} casts=${summary.casts} reservations=${summary.reservations} options=${summary.options} areas=${summary.areas} stations=${summary.stations} hotels=${summary.hotels} hotelServiceAreas=${summary.hotelServiceAreas} hotelRates=${summary.hotelRates} reservationOptions=${summary.reservationOptions} images=${imageReport.plannedFileCount} imageBytes=${imageReport.verifiedByteCount}`
    )
    exitCode = 0
  } catch (error) {
    let reportedError = error
    if (
      preparedImages &&
      imageIo &&
      imageReport?.success &&
      imageReport.createdFileCount === preparedImages.plan.files.length
    ) {
      try {
        for (const file of [...preparedImages.plan.files].reverse()) {
          await imageIo.rollbackCreated(file)
        }
      } catch {
        reportedError = new GoldMasterPreviewImageImportError(
          'GOLD_MASTER_PREVIEW_IMAGE_ROLLBACK_FAILED'
        )
      }
    }
    dependencies.writeError(`Gold master preview import failed: ${failureCode(reportedError)}`)
  }

  if (database) {
    try {
      await database.disconnect()
    } catch {
      if (exitCode === 0) {
        dependencies.writeError('Gold master preview import committed but disconnect failed')
        exitCode = 2
      }
    }
  }

  return exitCode
}

const executedPath = process.argv[1]
if (executedPath && import.meta.url === pathToFileURL(executedPath).href) {
  void runGoldMasterPreviewImport(process.argv.slice(2), process.env).then((code) => {
    process.exitCode = code
  })
}
