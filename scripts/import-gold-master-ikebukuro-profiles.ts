/**
 * @design_doc docs/verification/2026-09-05-notion-recheck.md
 * @related_to profile-refresh-plan - non-destructive field merge; preview-image-filesystem - verified exclusive image copies
 * @known_issues Preview-only supplement; existing account passwords, operational status and pricing are never overwritten
 */
import { createHash } from 'node:crypto'
import { pathToFileURL } from 'node:url'
import { isAbsolute } from 'node:path'
import { Prisma, PrismaClient } from '@prisma/client'
import { readPrivateLegacyJsonText } from '@/lib/migration/legacy/private-json-file'
import { createLegacyPreviewImageFilesystemIo } from '@/lib/migration/legacy/preview-image-filesystem'
import { assertPreviewUatTargetIdentity } from '@/lib/preview-uat/setup'
import { prepareGoldMasterPreviewImages } from '@/lib/preview-uat/gold-master-images'
import { buildProfileRefreshPlan } from '@/lib/preview-uat/profile-refresh-plan'
import {
  decryptMediaAccounts,
  encryptMediaAccounts,
  mergeMediaNamesIntoMarketingCatalog,
} from '@/lib/settings/media-accounts'
import type { LegacyPublicImageManifestEntry } from '@/lib/migration/legacy/image-manifest'

const hash = (text: string) => createHash('sha256').update(text).digest('hex')
export function profileRefreshSourceKey(snapshot: string, manifest: string) {
  return `gold-profiles-5600-${hash(snapshot + '\n' + manifest)}`
}
export function assertProfileRefreshEnvironment(env: Record<string, string | undefined>) {
  if (
    env.APP_RUNTIME_MODE !== 'preview' ||
    env.OUTBOUND_DELIVERY_MODE !== 'disabled' ||
    !env.DATABASE_URL ||
    !env.PREVIEW_TARGET_ID ||
    env.PREVIEW_TARGET_ID.length < 20 ||
    !env.NEXTAUTH_SECRET ||
    env.NEXTAUTH_SECRET.length < 32 ||
    env.STORAGE_ROOT !== '/var/lib/salon-preview-storage'
  )
    throw Error('PROFILE_REFRESH_CONFIG_REJECTED')
  const url = new URL(env.DATABASE_URL)
  if (
    !['postgresql:', 'postgres:'].includes(url.protocol) ||
    decodeURIComponent(url.pathname) !== '/salon_uat_preview'
  )
    throw Error('PROFILE_REFRESH_CONFIG_REJECTED')
  return {
    databaseUrl: env.DATABASE_URL,
    databaseName: 'salon_uat_preview',
    marker: env.PREVIEW_TARGET_ID,
    secret: env.NEXTAUTH_SECRET,
    targetRoot: `${env.STORAGE_ROOT}/images`,
  }
}
export async function verifyProfileRefreshTarget(
  client: { $queryRaw: (sql: Prisma.Sql) => Promise<unknown> },
  config: ReturnType<typeof assertProfileRefreshEnvironment>
) {
  const rows = await client.$queryRaw(
    Prisma.sql`SELECT current_database() AS "databaseName", current_setting('salon.environment',true) AS "environment", current_setting('salon.target_id',true) AS "marker"`
  )
  if (!Array.isArray(rows) || rows.length !== 1) throw Error('PROFILE_REFRESH_TARGET_REJECTED')
  assertPreviewUatTargetIdentity(rows[0], {
    databaseName: config.databaseName,
    environment: 'staging-preview',
    marker: config.marker,
  })
}

async function run() {
  const [mode, snapshotPath, manifestPath, sourceRoot] = process.argv.slice(2)
  if (
    !['--dry-run', '--apply'].includes(mode) ||
    ![snapshotPath, manifestPath, sourceRoot].every((value) => value && isAbsolute(value))
  )
    throw Error('PROFILE_REFRESH_ARGUMENTS_REJECTED')
  const config = assertProfileRefreshEnvironment(process.env)
  const sourceText = await readPrivateLegacyJsonText(snapshotPath, 32 * 1024 * 1024)
  const manifestText = await readPrivateLegacyJsonText(manifestPath, 16 * 1024 * 1024)
  const snapshot = JSON.parse(sourceText)
  // Validate all source entities before using any identifiers to access storage or the database.
  buildProfileRefreshPlan(snapshot, [], [], {}, new Set())
  const references = snapshot.casts.flatMap((row: Record<string, string | number | null>) =>
    Array.from({ length: 15 }, (_, i) => ({
      girlNo: Number(row.girl_no),
      slot: i + 1,
      fileName: String(row[`photo_${i + 1}`] ?? ''),
    })).filter((ref: { fileName: string }) => ref.fileName)
  )
  const prepared = prepareGoldMasterPreviewImages(
    { cutoffAt: new Date(snapshot.capturedAt).toISOString(), references },
    JSON.parse(manifestText)
  )
  const images: Record<string, string[]> = {}
  for (const file of prepared.plan.files) {
    const id = `legacy-cast-${file.owner.legacyId.split(':').at(-1)}`
    ;(images[id] ??= []).push(`/salon-uploads/${file.targetPath}`)
  }
  const io = createLegacyPreviewImageFilesystemIo({ sourceRoot, targetRoot: config.targetRoot })
  const identity = await io.inspectTargetIdentity()
  if (
    identity.realRoot !== config.targetRoot ||
    identity.environment !== 'staging-preview' ||
    identity.targetId !== config.marker
  )
    throw Error('PROFILE_REFRESH_STORAGE_REJECTED')
  const sourceKey = profileRefreshSourceKey(sourceText, manifestText)
  const db = new PrismaClient({ datasources: { db: { url: config.databaseUrl } } })
  const copied: LegacyPublicImageManifestEntry[] = []
  let committed = false
  try {
    await verifyProfileRefreshTarget(db, config)
    const prior = await db.legacyMigrationRun.findUnique({ where: { sourceKey } })
    if (prior) {
      console.log(JSON.stringify({ status: 'already-imported', sourceKey }))
      return
    }
    let reusedImages = 0
    for (const file of prepared.plan.files) {
      const source = await io.inspectSource(file)
      if (
        !source.isFile ||
        source.isSymbolicLink ||
        source.sha256 !== file.sha256 ||
        source.sizeBytes !== file.sizeBytes
      )
        throw Error('PROFILE_REFRESH_SOURCE_IMAGE_MISMATCH')
      const target = await io.inspectTarget(file)
      if (target) {
        if (
          !target.isFile ||
          target.isSymbolicLink ||
          target.sha256 !== file.sha256 ||
          target.sizeBytes !== file.sizeBytes
        )
          throw Error('PROFILE_REFRESH_TARGET_IMAGE_CONFLICT')
        reusedImages++
      }
    }
    const result = await db.$transaction(
      async (tx) => {
        const incomingIds = snapshot.casts.map(
          (row: Record<string, unknown>) => `legacy-cast-${row.girl_no}`
        )
        const current = await tx.cast.findMany({
          where: { OR: [{ storeId: 'uat-ikebukuro' }, { id: { in: incomingIds } }] },
          omit: { passwordHash: true, lineUserId: true },
        })
        const settings = await tx.storeSettings.findUniqueOrThrow({
          where: { storeId: 'uat-ikebukuro' },
        })
        const candidates = snapshot.casts
          .map((row: Record<string, unknown>) =>
            String(row.mail_ad ?? '')
              .trim()
              .toLowerCase()
          )
          .filter(Boolean)
        const claimed = await tx.cast.findMany({
          where: { loginEmail: { in: candidates } },
          select: { loginEmail: true },
        })
        const plan = buildProfileRefreshPlan(
          snapshot,
          current,
          decryptMediaAccounts(settings.mediaAccounts, config.secret),
          images,
          new Set(claimed.flatMap(({ loginEmail }) => (loginEmail ? [loginEmail] : [])))
        )
        const options = await tx.optionPrice.findMany({
          where: { storeId: 'uat-ikebukuro' },
          select: { id: true },
        })
        const optionIds = new Set(options.map(({ id }) => id))
        const unsupportedOptionReferences = plan.creates.reduce(
          (sum, cast) => sum + cast.availableOptions.filter((id) => !optionIds.has(id)).length,
          0
        )
        const report = {
          status: mode === '--apply' ? 'imported' : 'dry-run',
          sourceKey,
          sourceCasts: plan.sourceCastCount,
          sourceMedia: plan.sourceMediaCount,
          createdCasts: plan.creates.length,
          updatedCasts: plan.updates.length,
          retiredCreated: plan.creates.filter((cast) => cast.employmentStatus === 'retired').length,
          totalMedia: plan.media.length,
          pausedMedia: plan.media.filter((account) => account.isActive === false).length,
          conflictingEmails: plan.conflictingEmails,
          unsupportedOptionReferences,
          images: prepared.plan.files.length,
          reusedImages,
          fieldUpdates: plan.updates.reduce<Record<string, number>>((counts, { data }) => {
            for (const key of Object.keys(data)) counts[key] = (counts[key] ?? 0) + 1
            return counts
          }, {}),
        }
        if (mode === '--dry-run') return report
        // New files use exclusive creates; failed DB writes remove only files created by this run.
        for (const file of prepared.plan.files) {
          if (!(await io.inspectTarget(file))) {
            await io.copyExclusive(file)
            copied.push(file)
          }
        }
        for (const cast of plan.creates) {
          const selected = cast.availableOptions.filter((id) => optionIds.has(id))
          await tx.cast.create({
            data: {
              ...cast,
              publicProfile: cast.publicProfile as unknown as Prisma.InputJsonValue,
              availableOptions: selected,
            },
          })
          if (selected.length)
            await tx.castOptionSetting.createMany({
              data: selected.map((optionId) => ({
                castId: cast.id,
                optionId,
                visibility: 'public',
              })),
            })
        }
        for (const update of plan.updates) {
          const saved = await tx.cast.updateMany({
            where: { id: update.id, storeId: 'uat-ikebukuro', updatedAt: update.expectedUpdatedAt },
            data: update.data as Prisma.CastUncheckedUpdateManyInput,
          })
          if (saved.count !== 1) throw Error('PROFILE_REFRESH_CONCURRENT_EDIT')
        }
        const encrypted = encryptMediaAccounts(plan.media, config.secret)
        const savedSettings = await tx.storeSettings.updateMany({
          where: { id: settings.id, storeId: 'uat-ikebukuro', updatedAt: settings.updatedAt },
          data: {
            mediaAccounts: encrypted as unknown as Prisma.InputJsonValue,
            marketingChannels: mergeMediaNamesIntoMarketingCatalog(
              settings.marketingChannels,
              plan.media
            ),
          },
        })
        if (savedSettings.count !== 1) throw Error('PROFILE_REFRESH_CONCURRENT_SETTINGS')
        await tx.legacyMigrationRun.create({
          data: {
            sourceKey,
            targetId: config.marker,
            cutoffAt: new Date(plan.capturedAt),
            migrationManifestSha256: hash(manifestText),
            canonicalExportSha256: hash(sourceText),
            snapshotManifestSha256: hash(sourceText),
            extractorVersion: 'cast-profiles-v2',
            transformationPolicyVersion: 'additive-profile-refresh-v1',
            canonicalDigest: hash(JSON.stringify(report)),
            mappings: {
              create: [...plan.creates, ...plan.updates].map((cast) => ({
                legacyEntity: 'casts',
                legacyId: cast.id,
                targetId: cast.id,
                sourceHash: hash(JSON.stringify(cast)),
              })),
            },
          },
        })
        return report
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        timeout: 120000,
        maxWait: 10000,
      }
    )
    committed = true
    console.log(JSON.stringify(result))
  } finally {
    try {
      // Resolve a possibly ambiguous COMMIT before removing any newly linked images.
      if (
        !committed &&
        copied.length &&
        !(await db.legacyMigrationRun.findUnique({ where: { sourceKey } }))
      ) {
        for (const file of copied.reverse()) await io.rollbackCreated(file)
      }
    } finally {
      await db.$disconnect()
    }
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void run().catch((error: unknown) => {
    console.error(
      JSON.stringify({
        status: 'failed',
        code:
          error instanceof Error && /^PROFILE_REFRESH_/.test(error.message)
            ? error.message
            : 'PROFILE_REFRESH_FAILED',
      })
    )
    process.exitCode = 1
  })
}
