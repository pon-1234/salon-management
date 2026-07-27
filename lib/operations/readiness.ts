/**
 * @design_doc   docs/VPS_DEPLOYMENT.md production readiness contract
 * @related_to   app/api/health/route.ts, lib/config/env.ts, lib/notification/readiness.ts
 * @known_issues Third-party provider reachability requires separate staging delivery probes
 */
import { randomUUID } from 'node:crypto'
import { stat, unlink, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { loadEnv } from '@/lib/config/env'
import { db } from '@/lib/db'
import { getNotificationReadiness } from '@/lib/notification/readiness'

type RequiredCheckStatus = 'ready' | 'not_ready'
type OptionalCheckStatus = RequiredCheckStatus | 'disabled'

interface OperationalConfig {
  runtimeMode?: 'live' | 'preview'
  preview?: {
    targetId: string
  }
  storage: {
    root: string
    publicBaseUrl: string
  }
  line: {
    messaging: {
      enabled: boolean
      channelAccessToken: string
      channelSecret: string
    }
  }
}

interface ReadinessDependencies {
  config?: OperationalConfig
  databaseProbe?: () => Promise<unknown>
  previewDatabaseIdentityProbe?: (targetId: string) => Promise<unknown>
  storageProbe?: (root: string) => Promise<unknown>
  notificationProbe?: () => { ready: boolean }
}

interface StorageProbeIo {
  stat: (path: string) => Promise<{ isDirectory: () => boolean }>
  writeFile: (
    path: string,
    data: string,
    options: { encoding: 'utf8'; flag: 'wx'; mode: number }
  ) => Promise<unknown>
  unlink: (path: string) => Promise<unknown>
  createProbeName: () => string
}

export interface OperationalReadiness {
  ready: boolean
  checks: {
    database: RequiredCheckStatus
    storage: RequiredCheckStatus
    notifications: RequiredCheckStatus
    line: OptionalCheckStatus
  }
}

const storageProbeIo: StorageProbeIo = {
  stat,
  writeFile,
  unlink,
  createProbeName: () => `.salon-readiness-${process.pid}-${randomUUID()}`,
}

export async function probeDatabase(): Promise<void> {
  await db.$queryRaw`SELECT 1`
}

export async function probePreviewDatabaseIdentity(targetId: string): Promise<void> {
  const rows = await db.$queryRaw<Array<{ environment: string | null; targetId: string | null }>>`
    SELECT
      current_setting('salon.environment', true) AS "environment",
      current_setting('salon.target_id', true) AS "targetId"
  `
  const identity = rows[0]
  if (
    rows.length !== 1 ||
    identity?.environment !== 'staging-preview' ||
    identity.targetId !== targetId
  ) {
    throw new Error('Preview database identity mismatch')
  }
}

export async function probeWritableStorage(
  root: string,
  io: StorageProbeIo = storageProbeIo
): Promise<void> {
  const rootStat = await io.stat(root)
  if (!rootStat.isDirectory()) {
    throw new Error('Configured storage root is not a directory')
  }

  const probePath = join(root, io.createProbeName())
  let probeCreated = false
  try {
    await io.writeFile(probePath, '', { encoding: 'utf8', flag: 'wx', mode: 0o600 })
    probeCreated = true
  } finally {
    if (probeCreated) {
      await io.unlink(probePath)
    }
  }
}

async function statusFromProbe(probe: () => Promise<unknown>): Promise<RequiredCheckStatus> {
  try {
    await probe()
    return 'ready'
  } catch {
    return 'not_ready'
  }
}

function hasValue(value: string): boolean {
  return value.trim().length > 0
}

export async function getOperationalReadiness(
  dependencies: ReadinessDependencies = {}
): Promise<OperationalReadiness> {
  const config = dependencies.config ?? loadEnv()
  const databaseProbe = dependencies.databaseProbe ?? probeDatabase
  const previewDatabaseIdentityProbe =
    dependencies.previewDatabaseIdentityProbe ?? probePreviewDatabaseIdentity
  const storageProbe = dependencies.storageProbe ?? probeWritableStorage
  const notificationProbe = dependencies.notificationProbe ?? getNotificationReadiness

  const [database, storage] = await Promise.all([
    statusFromProbe(async () => {
      await databaseProbe()
      if (config.runtimeMode === 'preview') {
        const targetId = config.preview?.targetId
        if (!targetId) throw new Error('Preview target marker is missing')
        await previewDatabaseIdentityProbe(targetId)
      }
    }),
    statusFromProbe(() => storageProbe(config.storage.root)),
  ])

  let notifications: RequiredCheckStatus = 'not_ready'
  try {
    notifications = notificationProbe().ready ? 'ready' : 'not_ready'
  } catch {
    notifications = 'not_ready'
  }

  const line: OptionalCheckStatus = config.line.messaging.enabled
    ? hasValue(config.line.messaging.channelAccessToken) &&
      hasValue(config.line.messaging.channelSecret)
      ? 'ready'
      : 'not_ready'
    : 'disabled'

  const ready =
    database === 'ready' && storage === 'ready' && notifications === 'ready' && line !== 'not_ready'

  return {
    ready,
    checks: { database, storage, notifications, line },
  }
}
