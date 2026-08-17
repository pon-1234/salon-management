/**
 * @design_doc   Monthly gold-esthe cashbook supplement into an existing isolated preview
 * @related_to   legacy-ledger-import.ts, extract-gold-master-ikebukuro-preview.php
 * @known_issues This writes only CastLedgerEntry and hourlyGuaranteeAmount; it is not a cutover path
 */
import { isAbsolute } from 'node:path'
import { pathToFileURL } from 'node:url'

import { Prisma, PrismaClient } from '@prisma/client'

import { readPrivateLegacyJsonText } from '@/lib/migration/legacy/private-json-file'
import { parseStrictJson } from '@/lib/migration/legacy/strict-json'
import { PreviewUatSetupError, assertPreviewUatTargetIdentity } from '@/lib/preview-uat/setup'
import {
  IKEBUKURO_LEDGER_ACKNOWLEDGEMENT,
  applyLegacyCastLedgerSnapshot,
} from '@/lib/settlement/legacy-ledger-import'

export { IKEBUKURO_LEDGER_ACKNOWLEDGEMENT }

const MAXIMUM_SNAPSHOT_BYTES = 32 * 1024 * 1024
const STORE_ID = 'uat-ikebukuro'
const PREVIEW_DATABASE_PATTERN = /^[a-z0-9][a-z0-9_-]*_preview$/u
const STRONG_MARKER_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{19,127}$/u

type LedgerImportEnvironment = Record<string, string | undefined>

export interface GoldMasterLedgerImportDependencies {
  readSnapshot(path: string): Promise<unknown>
  createClient(databaseUrl: string): {
    $queryRaw<T>(query: Prisma.Sql): Promise<T>
    $transaction<T>(operation: (transaction: Prisma.TransactionClient) => Promise<T>): Promise<T>
    $disconnect(): Promise<void>
  }
  writeOutput(message: string): void
  writeError(message: string): void
}

const defaultDependencies: GoldMasterLedgerImportDependencies = {
  async readSnapshot(path) {
    const text = await readPrivateLegacyJsonText(path, MAXIMUM_SNAPSHOT_BYTES)
    return parseStrictJson(text, MAXIMUM_SNAPSHOT_BYTES)
  },
  createClient: (databaseUrl) =>
    new PrismaClient({
      datasources: { db: { url: databaseUrl } },
    }),
  writeOutput: (message) => console.log(message),
  writeError: (message) => console.error(message),
}

class GoldMasterLedgerConfigError extends Error {
  constructor() {
    super('IKEBUKURO_LEDGER_IMPORT_CONFIG_REJECTED')
    this.name = 'GoldMasterLedgerConfigError'
  }
}

function parseArguments(argv: string[]): { snapshotPath: string; storeId: string } {
  const normalized = argv[0] === '--' ? argv.slice(1) : argv
  if (normalized.length !== 6) throw new GoldMasterLedgerConfigError()
  if (normalized[0] !== '--snapshot') throw new GoldMasterLedgerConfigError()
  if (!normalized[1] || !isAbsolute(normalized[1]) || !normalized[1].endsWith('.json')) {
    throw new GoldMasterLedgerConfigError()
  }
  if (normalized[2] !== '--store-id' || normalized[3] !== STORE_ID) {
    throw new GoldMasterLedgerConfigError()
  }
  if (normalized[4] !== '--ack' || normalized[5] !== IKEBUKURO_LEDGER_ACKNOWLEDGEMENT) {
    throw new GoldMasterLedgerConfigError()
  }
  return { snapshotPath: normalized[1], storeId: STORE_ID }
}

function parseDatabaseUrl(databaseUrl: string | undefined): {
  databaseUrl: string
  databaseName: string
} {
  if (!databaseUrl || databaseUrl.trim() !== databaseUrl) throw new GoldMasterLedgerConfigError()
  try {
    const parsed = new URL(databaseUrl)
    if (
      (parsed.protocol !== 'postgresql:' && parsed.protocol !== 'postgres:') ||
      parsed.hostname.length === 0 ||
      parsed.hash.length > 0
    ) {
      throw new GoldMasterLedgerConfigError()
    }
    const search = parsed.searchParams
    if (search.size > 1 || (search.size === 1 && search.get('schema') !== 'public')) {
      throw new GoldMasterLedgerConfigError()
    }
    const databaseName = decodeURIComponent(parsed.pathname).slice(1)
    if (!PREVIEW_DATABASE_PATTERN.test(databaseName)) throw new GoldMasterLedgerConfigError()
    return { databaseUrl, databaseName }
  } catch (error) {
    if (error instanceof GoldMasterLedgerConfigError) throw error
    throw new GoldMasterLedgerConfigError()
  }
}

function parseConfig(argv: string[], environment: LedgerImportEnvironment) {
  const args = parseArguments(argv)
  if (environment.APP_RUNTIME_MODE !== 'preview') {
    throw new GoldMasterLedgerConfigError()
  }
  if (environment.OUTBOUND_DELIVERY_MODE !== 'disabled') {
    throw new GoldMasterLedgerConfigError()
  }
  const marker = environment.PREVIEW_TARGET_ID
  if (!marker || marker.trim() !== marker || !STRONG_MARKER_PATTERN.test(marker)) {
    throw new GoldMasterLedgerConfigError()
  }
  return {
    ...args,
    ...parseDatabaseUrl(environment.DATABASE_URL),
    marker,
  }
}

function failureCode(error: unknown): string {
  if (error instanceof GoldMasterLedgerConfigError) return error.message
  if (error instanceof PreviewUatSetupError) return error.code
  if (error instanceof Error && error.message === 'IKEBUKURO_LEDGER_SNAPSHOT_REJECTED') {
    return error.message
  }
  return 'IKEBUKURO_LEDGER_IMPORT_FAILED'
}

/** Imports one cashbook snapshot into a marked preview without emptying existing UAT rows. */
export async function runGoldMasterLedgerImport(
  argv: string[],
  environment: LedgerImportEnvironment,
  dependencies: GoldMasterLedgerImportDependencies = defaultDependencies
): Promise<number> {
  let client: ReturnType<GoldMasterLedgerImportDependencies['createClient']> | undefined
  try {
    const config = parseConfig(argv, environment)
    const snapshot = await dependencies.readSnapshot(config.snapshotPath)
    client = dependencies.createClient(config.databaseUrl)
    const identityRows = await client.$queryRaw<
      Array<{ databaseName: string; environment: string; marker: string }>
    >(Prisma.sql`
      SELECT
        current_database() AS "databaseName",
        current_setting('salon.environment', true) AS "environment",
        current_setting('salon.target_id', true) AS "marker"
    `)
    if (identityRows.length !== 1) throw new PreviewUatSetupError('PREVIEW_UAT_TARGET_REJECTED')
    assertPreviewUatTargetIdentity(identityRows[0], {
      databaseName: config.databaseName,
      environment: 'staging-preview',
      marker: config.marker,
    })

    const result = await client.$transaction(async (transaction) => {
      const casts = await transaction.cast.findMany({
        where: { storeId: config.storeId },
        select: { id: true },
      })
      return applyLegacyCastLedgerSnapshot({
        snapshot,
        storeId: config.storeId,
        importedCastIds: new Set(casts.map((cast) => cast.id)),
        acknowledgement: IKEBUKURO_LEDGER_ACKNOWLEDGEMENT,
        write: {
          async createLedgerEntries(entries) {
            const created = await transaction.castLedgerEntry.createMany({
              data: entries,
              skipDuplicates: true,
            })
            return created.count
          },
          async updateHourlyGuarantee(storeId, amount) {
            await transaction.storeSettings.update({
              where: { storeId },
              data: { hourlyGuaranteeAmount: amount },
            })
          },
        },
      })
    })

    dependencies.writeOutput(
      `Ikebukuro cast ledger imported: created=${result.created} droppedMissingCast=${result.droppedMissingCast} hourlyGuaranteeAmount=${result.hourlyGuaranteeAmount}`
    )
    return 0
  } catch (error) {
    dependencies.writeError(`Ikebukuro cast ledger import failed: ${failureCode(error)}`)
    return 1
  } finally {
    if (client) {
      await client.$disconnect()
    }
  }
}

const executedPath = process.argv[1]
if (executedPath && import.meta.url === pathToFileURL(executedPath).href) {
  void runGoldMasterLedgerImport(process.argv.slice(2), process.env).then((code) => {
    process.exitCode = code
  })
}
