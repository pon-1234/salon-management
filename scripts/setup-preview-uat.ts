/**
 * @design_doc   docs/PREVIEW_UAT_CHECKLIST.md explicit synthetic preview UAT setup operation
 * @related_to   lib/preview-uat/setup.ts; lib/preview-uat/prisma-adapter.ts
 * @known_issues This command provisions synthetic data only; it is not a legacy migration tool
 */
import { pathToFileURL } from 'node:url'

import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'

import { createPrismaPreviewUatDatabase } from '@/lib/preview-uat/prisma-adapter'
import {
  PreviewUatSetupError,
  parsePreviewUatSetupConfig,
  provisionPreviewUat,
  type PreviewUatDatabase,
} from '@/lib/preview-uat/setup'

interface PreviewUatRunnerDependencies {
  createDatabase(databaseUrl: string): PreviewUatDatabase
  hashPassword(password: string): Promise<string>
  now(): Date
  writeOutput(message: string): void
  writeError(message: string): void
}

type PreviewUatEnvironment = Record<string, string | undefined>

const defaultDependencies: PreviewUatRunnerDependencies = {
  createDatabase: (databaseUrl) =>
    createPrismaPreviewUatDatabase(
      new PrismaClient({
        datasources: { db: { url: databaseUrl } },
      })
    ),
  hashPassword: (password) => hash(password, 12),
  now: () => new Date(),
  writeOutput: (message) => console.log(message),
  writeError: (message) => console.error(message),
}

function errorCode(error: unknown): string {
  return error instanceof PreviewUatSetupError ? error.code : 'PREVIEW_UAT_SETUP_FAILED'
}

/** Runs the fail-closed CLI boundary and returns an exit code without exposing secret values. */
export async function runPreviewUatSetup(
  argv: string[],
  environment: PreviewUatEnvironment,
  dependencies: PreviewUatRunnerDependencies = defaultDependencies
): Promise<number> {
  let database: PreviewUatDatabase | undefined
  let exitCode = 1

  try {
    const config = parsePreviewUatSetupConfig(argv, environment)
    database = dependencies.createDatabase(config.databaseUrl)
    const summary = await provisionPreviewUat({
      database,
      config,
      hashPassword: dependencies.hashPassword,
      now: dependencies.now(),
    })
    dependencies.writeOutput(
      `Preview UAT setup created: stores=${summary.stores} admins=${summary.admins} customers=${summary.customers} casts=${summary.casts} reservations=${summary.reservations} options=${summary.options} areas=${summary.areas} stations=${summary.stations} hotels=${summary.hotels} hotelServiceAreas=${summary.hotelServiceAreas} hotelRates=${summary.hotelRates} reservationOptions=${summary.reservationOptions}`
    )
    exitCode = 0
  } catch (error) {
    dependencies.writeError(`Preview UAT setup failed: ${errorCode(error)}`)
  }

  if (database) {
    try {
      await database.disconnect()
    } catch {
      if (exitCode === 0) {
        dependencies.writeError('Preview UAT setup committed but disconnect failed')
        exitCode = 2
      }
    }
  }

  return exitCode
}

const executedPath = process.argv[1]
if (executedPath && import.meta.url === pathToFileURL(executedPath).href) {
  void runPreviewUatSetup(process.argv.slice(2), process.env).then((code) => {
    process.exitCode = code
  })
}
