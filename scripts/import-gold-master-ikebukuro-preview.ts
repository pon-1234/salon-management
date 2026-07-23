/**
 * @design_doc   docs/PREVIEW_UAT_CHECKLIST.md guarded sanitized Ikebukuro import command
 * @related_to   lib/preview-uat/gold-master-fixture.ts and prisma-adapter.ts
 * @known_issues The source snapshot is a non-atomic UAT projection and cannot authorize cutover
 */
import { isAbsolute } from 'node:path'
import { pathToFileURL } from 'node:url'

import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'

import { readPrivateLegacyJsonText } from '@/lib/migration/legacy/private-json-file'
import { parseStrictJson } from '@/lib/migration/legacy/strict-json'
import {
  GoldMasterPreviewError,
  buildGoldMasterPreviewFixture,
} from '@/lib/preview-uat/gold-master-fixture'
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

interface GoldMasterPreviewRunnerDependencies {
  readSnapshot(path: string): Promise<unknown>
  createDatabase(databaseUrl: string): PreviewUatDatabase
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

const defaultDependencies: GoldMasterPreviewRunnerDependencies = {
  async readSnapshot(path) {
    const text = await readPrivateLegacyJsonText(path, MAXIMUM_SNAPSHOT_BYTES)
    return parseStrictJson(text, MAXIMUM_SNAPSHOT_BYTES)
  },
  createDatabase: (databaseUrl) =>
    createPrismaPreviewUatDatabase(
      new PrismaClient({
        datasources: { db: { url: databaseUrl } },
      })
    ),
  hashPassword: (password) => hash(password, 12),
  writeOutput: (message) => console.log(message),
  writeError: (message) => console.error(message),
}

function parseArguments(argv: string[]): string {
  const normalizedArguments = argv[0] === '--' ? argv.slice(1) : argv
  if (
    normalizedArguments.length !== 4 ||
    normalizedArguments[0] !== '--snapshot' ||
    !normalizedArguments[1] ||
    !isAbsolute(normalizedArguments[1]) ||
    !normalizedArguments[1].endsWith('.json') ||
    normalizedArguments[2] !== '--ack' ||
    normalizedArguments[3] !== GOLD_MASTER_PREVIEW_ACKNOWLEDGEMENT
  ) {
    throw new GoldMasterPreviewConfigError()
  }
  return normalizedArguments[1]
}

function failureCode(error: unknown): string {
  if (error instanceof GoldMasterPreviewConfigError) return error.message
  if (error instanceof GoldMasterPreviewError) return error.message
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
  let exitCode = 1

  try {
    const snapshotPath = parseArguments(argv)
    const config = parsePreviewUatSetupConfig(['--ack', PREVIEW_UAT_ACKNOWLEDGEMENT], environment)
    const snapshot = await dependencies.readSnapshot(snapshotPath)
    const passwordHashes = {
      admin: await dependencies.hashPassword(config.passwords.admin),
      customer: await dependencies.hashPassword(config.passwords.customer),
      cast: await dependencies.hashPassword(config.passwords.cast),
    }
    const fixture = buildGoldMasterPreviewFixture(snapshot, { passwordHashes })
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
      `Gold master preview imported: stores=${summary.stores} admins=${summary.admins} customers=${summary.customers} casts=${summary.casts} reservations=${summary.reservations} options=${summary.options} areas=${summary.areas} stations=${summary.stations} hotels=${summary.hotels} hotelServiceAreas=${summary.hotelServiceAreas} hotelRates=${summary.hotelRates} reservationOptions=${summary.reservationOptions}`
    )
    exitCode = 0
  } catch (error) {
    dependencies.writeError(`Gold master preview import failed: ${failureCode(error)}`)
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
