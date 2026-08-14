/**
 * @design_doc   docs/LEGACY_DATA_MIGRATION_RUNBOOK.md V5 pre-import verification gate
 * @related_to   gold-master-verification.ts computes the PII-free control; gold-master-post-import-sql.ts renders reconciliation SQL
 * @known_issues This command verifies local artifacts only and intentionally never connects to or writes a database
 */
import { createHash } from 'node:crypto'
import { constants } from 'node:fs'
import { lstat, open, readdir, realpath, unlink } from 'node:fs/promises'
import { basename, dirname, isAbsolute, join, parse, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

import { inspectLegacyPreviewImageSourcePackage } from '@/lib/migration/legacy/preview-image-filesystem'
import { readPrivateLegacyJsonText } from '@/lib/migration/legacy/private-json-file'
import { parseStrictJson } from '@/lib/migration/legacy/strict-json'
import { buildGoldMasterPostImportSql } from '@/lib/preview-uat/gold-master-post-import-sql'
import {
  calculateGoldMasterPreviewControlSha256,
  createGoldMasterPreviewVerificationControl,
  parseGoldMasterPreviewVerificationControl,
  type GoldMasterPreviewMigrationVerification,
  type GoldMasterPreviewVerificationControl,
} from '@/lib/preview-uat/gold-master-verification'

export const GOLD_MASTER_PREVIEW_CONTROL_ACKNOWLEDGEMENT =
  'VERIFY_IKEBUKURO_V5_ARTIFACT_WITHOUT_DATABASE_WRITES'

const MAXIMUM_SNAPSHOT_BYTES = 128 * 1024 * 1024
const MAXIMUM_IMAGE_MANIFEST_BYTES = 16 * 1024 * 1024
const MAXIMUM_CONTROL_BYTES = 16 * 1024 * 1024
const MAXIMUM_MIGRATION_BYTES = 16 * 1024 * 1024
const MAXIMUM_OUTPUT_BYTES = 64 * 1024 * 1024
const MIGRATION_NAME_PATTERN = /^\d{14}_[a-z0-9_]+$/u

interface GoldMasterPreviewVerificationArguments {
  snapshotPath: string
  imageManifestPath: string
  imageSourceRoot: string
  controlMode: 'read' | 'write'
  controlPath: string
  reportPath: string
  postImportSqlPath: string
  migrationsRoot: string
}

export interface GoldMasterPreviewVerifierDependencies {
  computeControl(
    args: GoldMasterPreviewVerificationArguments
  ): Promise<GoldMasterPreviewVerificationControl>
  readControl(path: string): Promise<GoldMasterPreviewVerificationControl>
  writePrivateText(path: string, value: string): Promise<void>
  writeOutput(message: string): void
  writeError(message: string): void
}

export interface GoldMasterPreviewVerifierFileIo {
  writePrivateText(path: string, value: string): Promise<void>
}

class GoldMasterPreviewVerificationConfigError extends Error {
  constructor() {
    super('GOLD_MASTER_PREVIEW_VERIFICATION_CONFIG_REJECTED')
    this.name = 'GoldMasterPreviewVerificationConfigError'
  }
}

class GoldMasterPreviewVerificationFileError extends Error {
  constructor() {
    super('GOLD_MASTER_PREVIEW_VERIFICATION_FILE_REJECTED')
    this.name = 'GoldMasterPreviewVerificationFileError'
  }
}

/** Creates an exclusive owner-only writer limited to this workspace's ignored migration-data directory. */
export function createGoldMasterPreviewVerifierFileIo(
  cwdInput: string
): GoldMasterPreviewVerifierFileIo {
  const cwd = validateAbsolutePath(cwdInput)
  const outputDirectory = join(cwd, 'migration-data')

  return {
    async writePrivateText(outputPathInput, value) {
      let handle: Awaited<ReturnType<typeof open>> | undefined
      let created = false
      const outputPath = validateOutputPath(outputPathInput, cwd)
      try {
        if (
          typeof value !== 'string' ||
          value.length === 0 ||
          Buffer.byteLength(value, 'utf8') > MAXIMUM_OUTPUT_BYTES
        ) {
          throw new GoldMasterPreviewVerificationFileError()
        }
        const executionUid = requireExecutionUid()
        const [canonicalCwd, canonicalOutputDirectory] = await Promise.all([
          realpath(cwd),
          realpath(outputDirectory),
        ])
        if (canonicalOutputDirectory !== join(canonicalCwd, 'migration-data')) {
          throw new GoldMasterPreviewVerificationFileError()
        }
        const directoryStats = await lstat(outputDirectory)
        if (
          !directoryStats.isDirectory() ||
          directoryStats.isSymbolicLink() ||
          directoryStats.uid !== executionUid ||
          (directoryStats.mode & 0o077) !== 0
        ) {
          throw new GoldMasterPreviewVerificationFileError()
        }

        handle = await open(
          outputPath,
          constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY | constants.O_NOFOLLOW,
          0o600
        )
        created = true
        await handle.writeFile(value, { encoding: 'utf8' })
        await handle.sync()
        const openedStats = await handle.stat()
        if (
          !openedStats.isFile() ||
          openedStats.uid !== executionUid ||
          (openedStats.mode & 0o777) !== 0o600 ||
          openedStats.size !== Buffer.byteLength(value, 'utf8')
        ) {
          throw new GoldMasterPreviewVerificationFileError()
        }
        await handle.close()
        handle = undefined
        const finalStats = await lstat(outputPath)
        if (
          finalStats.isSymbolicLink() ||
          !finalStats.isFile() ||
          finalStats.dev !== openedStats.dev ||
          finalStats.ino !== openedStats.ino ||
          finalStats.size !== openedStats.size ||
          finalStats.uid !== openedStats.uid ||
          finalStats.mode !== openedStats.mode
        ) {
          throw new GoldMasterPreviewVerificationFileError()
        }
      } catch (error) {
        if (handle) {
          try {
            await handle.close()
          } catch (closeError) {
            throw new AggregateError(
              [error, closeError],
              'GOLD_MASTER_PREVIEW_VERIFICATION_FILE_CLEANUP_REJECTED'
            )
          }
        }
        if (created) {
          try {
            await unlink(outputPath)
          } catch (cleanupError) {
            throw new AggregateError(
              [error, cleanupError],
              'GOLD_MASTER_PREVIEW_VERIFICATION_FILE_CLEANUP_REJECTED'
            )
          }
        }
        throw new GoldMasterPreviewVerificationFileError()
      }
    },
  }
}

/** Verifies the complete local V5 artifact and emits only redacted evidence and read-only SQL. */
export async function runGoldMasterPreviewVerification(
  argv: string[],
  cwdInput: string,
  dependenciesInput?: GoldMasterPreviewVerifierDependencies
): Promise<number> {
  let dependencies: GoldMasterPreviewVerifierDependencies | undefined
  try {
    const args = parseArguments(argv, cwdInput)
    dependencies = dependenciesInput ?? createDefaultDependencies(cwdInput)
    const computed = parseGoldMasterPreviewVerificationControl(
      await dependencies.computeControl(args)
    )
    const computedSha256 = calculateGoldMasterPreviewControlSha256(computed)

    if (args.controlMode === 'read') {
      const approved = parseGoldMasterPreviewVerificationControl(
        await dependencies.readControl(args.controlPath)
      )
      const approvedSha256 = calculateGoldMasterPreviewControlSha256(approved)
      if (computedSha256 !== approvedSha256) {
        await dependencies.writePrivateText(
          args.reportPath,
          serializeJson({
            version: 1,
            success: false,
            evidenceScope: 'none',
            status: 'CONTROL_MISMATCH',
            approvedControlSha256: approvedSha256,
            computedControlSha256: computedSha256,
          })
        )
        dependencies.writeError('Ikebukuro preview artifact verification failed: CONTROL_MISMATCH')
        return 2
      }
    }

    const sql = buildGoldMasterPostImportSql(computed)
    const report = serializeJson({
      version: 1,
      success: true,
      evidenceScope: 'ikebukuro-preview-artifact',
      status: args.controlMode === 'write' ? 'CONTROL_CREATED' : 'CONTROL_MATCHED',
      controlSha256: computedSha256,
      control: computed,
    })
    const controlText = serializeJson(computed)

    if (args.controlMode === 'write') {
      await dependencies.writePrivateText(args.controlPath, controlText)
    }
    await dependencies.writePrivateText(args.postImportSqlPath, sql)
    await dependencies.writePrivateText(args.reportPath, report)
    dependencies.writeOutput(
      'Ikebukuro preview artifact verification succeeded; review the redacted report.'
    )
    return 0
  } catch (error) {
    const code =
      error instanceof GoldMasterPreviewVerificationConfigError
        ? error.message
        : 'GOLD_MASTER_PREVIEW_VERIFICATION_REJECTED'
    const writer = dependencies?.writeError ?? dependenciesInput?.writeError ?? console.error
    writer(`Ikebukuro preview artifact verification failed: ${code}`)
    return 1
  }
}

function createDefaultDependencies(cwdInput: string): GoldMasterPreviewVerifierDependencies {
  const cwd = validateAbsolutePath(cwdInput)
  const fileIo = createGoldMasterPreviewVerifierFileIo(cwd)
  return {
    async computeControl(args) {
      const [snapshotText, imageManifestText] = await Promise.all([
        readPrivateLegacyJsonText(args.snapshotPath, MAXIMUM_SNAPSHOT_BYTES),
        readPrivateLegacyJsonText(args.imageManifestPath, MAXIMUM_IMAGE_MANIFEST_BYTES),
      ])
      return createGoldMasterPreviewVerificationControl(
        {
          snapshotInput: parseStrictJson(snapshotText, MAXIMUM_SNAPSHOT_BYTES),
          snapshotSha256: sha256(snapshotText),
          imageManifestInput: parseStrictJson(imageManifestText, MAXIMUM_IMAGE_MANIFEST_BYTES),
          imageManifestSha256: sha256(imageManifestText),
          imageSourceRoot: args.imageSourceRoot,
          migrationsRoot: args.migrationsRoot,
        },
        {
          inspectImages: inspectLegacyPreviewImageSourcePackage,
          readMigrations: readMigrationVerificationSet,
        }
      )
    },
    async readControl(path) {
      const text = await readPrivateLegacyJsonText(path, MAXIMUM_CONTROL_BYTES)
      return parseGoldMasterPreviewVerificationControl(parseStrictJson(text, MAXIMUM_CONTROL_BYTES))
    },
    writePrivateText: fileIo.writePrivateText,
    writeOutput: (message) => console.log(message),
    writeError: (message) => console.error(message),
  }
}

function parseArguments(argv: string[], cwdInput: string): GoldMasterPreviewVerificationArguments {
  const cwd = validateAbsolutePath(cwdInput)
  const normalized = argv[0] === '--' ? argv.slice(1) : argv
  if (
    normalized.length !== 14 ||
    normalized[0] !== '--snapshot' ||
    normalized[2] !== '--image-manifest' ||
    normalized[4] !== '--image-source-root' ||
    (normalized[6] !== '--control' && normalized[6] !== '--write-control') ||
    normalized[8] !== '--report' ||
    normalized[10] !== '--post-import-sql' ||
    normalized[12] !== '--ack' ||
    normalized[13] !== GOLD_MASTER_PREVIEW_CONTROL_ACKNOWLEDGEMENT
  ) {
    throw new GoldMasterPreviewVerificationConfigError()
  }
  const snapshotPath = validateJsonInputPath(normalized[1])
  const imageManifestPath = validateJsonInputPath(normalized[3])
  const imageSourceRoot = validateAbsolutePath(normalized[5])
  const controlPath = validateOutputPath(normalized[7], cwd, '.json')
  const reportPath = validateOutputPath(normalized[9], cwd, '.json')
  const postImportSqlPath = validateOutputPath(normalized[11], cwd, '.sql')
  const uniquePaths = new Set([
    snapshotPath,
    imageManifestPath,
    imageSourceRoot,
    controlPath,
    reportPath,
    postImportSqlPath,
  ])
  if (uniquePaths.size !== 6) throw new GoldMasterPreviewVerificationConfigError()
  return {
    snapshotPath,
    imageManifestPath,
    imageSourceRoot,
    controlMode: normalized[6] === '--write-control' ? 'write' : 'read',
    controlPath,
    reportPath,
    postImportSqlPath,
    migrationsRoot: join(cwd, 'prisma', 'migrations'),
  }
}

function validateJsonInputPath(value: string | undefined): string {
  const path = validateAbsolutePath(value)
  if (!path.endsWith('.json')) throw new GoldMasterPreviewVerificationConfigError()
  return path
}

function validateOutputPath(
  value: string | undefined,
  cwdInput: string,
  requiredExtension?: '.json' | '.sql'
): string {
  const cwd = validateAbsolutePath(cwdInput)
  const outputPath = validateAbsolutePath(value)
  const extension = requiredExtension ?? (outputPath.endsWith('.json') ? '.json' : '.sql')
  if (
    !outputPath.endsWith(extension) ||
    dirname(outputPath) !== join(cwd, 'migration-data') ||
    basename(outputPath).startsWith('.') ||
    basename(outputPath).length > 255
  ) {
    throw new GoldMasterPreviewVerificationConfigError()
  }
  return outputPath
}

function validateAbsolutePath(value: string | undefined): string {
  if (
    !value ||
    value.length > 4096 ||
    value.includes('\\') ||
    value.includes('\0') ||
    !isAbsolute(value) ||
    resolve(value) !== value ||
    parse(value).root === value
  ) {
    throw new GoldMasterPreviewVerificationConfigError()
  }
  return value
}

async function readMigrationVerificationSet(
  rootInput: string
): Promise<GoldMasterPreviewMigrationVerification[]> {
  const root = validateAbsolutePath(rootInput)
  const canonicalRoot = await realpath(root)
  const rootStats = await lstat(root)
  if (canonicalRoot !== root || rootStats.isSymbolicLink() || !rootStats.isDirectory()) {
    throw new GoldMasterPreviewVerificationFileError()
  }
  const beforeEntries = await readMigrationRootEntries(root)
  const migrations: GoldMasterPreviewMigrationVerification[] = []
  for (const name of beforeEntries) {
    if (name === 'migration_lock.toml') {
      await assertRegularCanonicalFile(join(root, name))
      continue
    }
    if (!MIGRATION_NAME_PATTERN.test(name)) {
      throw new GoldMasterPreviewVerificationFileError()
    }
    const migrationDirectory = join(root, name)
    const directoryStats = await lstat(migrationDirectory)
    if (
      directoryStats.isSymbolicLink() ||
      !directoryStats.isDirectory() ||
      (await realpath(migrationDirectory)) !== migrationDirectory
    ) {
      throw new GoldMasterPreviewVerificationFileError()
    }
    const children = (await readdir(migrationDirectory)).sort(compareText)
    if (children.length !== 1 || children[0] !== 'migration.sql') {
      throw new GoldMasterPreviewVerificationFileError()
    }
    migrations.push({
      name,
      sha256: await hashStableMigrationFile(join(migrationDirectory, 'migration.sql')),
    })
  }
  const afterEntries = await readMigrationRootEntries(root)
  if (
    beforeEntries.length !== afterEntries.length ||
    beforeEntries.some((entry, index) => entry !== afterEntries[index]) ||
    (await realpath(root)) !== canonicalRoot
  ) {
    throw new GoldMasterPreviewVerificationFileError()
  }
  return migrations
}

async function readMigrationRootEntries(root: string): Promise<string[]> {
  return (await readdir(root)).sort(compareText)
}

async function assertRegularCanonicalFile(path: string): Promise<void> {
  const stats = await lstat(path)
  if (stats.isSymbolicLink() || !stats.isFile() || (await realpath(path)) !== path) {
    throw new GoldMasterPreviewVerificationFileError()
  }
}

async function hashStableMigrationFile(path: string): Promise<string> {
  await assertRegularCanonicalFile(path)
  const before = await lstat(path)
  if (before.size > MAXIMUM_MIGRATION_BYTES) {
    throw new GoldMasterPreviewVerificationFileError()
  }
  const handle = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW)
  try {
    const opened = await handle.stat()
    if (!sameStableFile(before, opened)) throw new GoldMasterPreviewVerificationFileError()
    const contents = await handle.readFile()
    if (contents.byteLength !== opened.size || contents.byteLength > MAXIMUM_MIGRATION_BYTES) {
      throw new GoldMasterPreviewVerificationFileError()
    }
    const after = await lstat(path)
    if (!sameStableFile(opened, after)) throw new GoldMasterPreviewVerificationFileError()
    return createHash('sha256').update(contents).digest('hex')
  } finally {
    await handle.close()
  }
}

function sameStableFile(
  left: Awaited<ReturnType<typeof lstat>>,
  right: Awaited<ReturnType<typeof lstat>>
): boolean {
  return (
    left.isFile() &&
    right.isFile() &&
    !left.isSymbolicLink() &&
    !right.isSymbolicLink() &&
    left.dev === right.dev &&
    left.ino === right.ino &&
    left.size === right.size &&
    left.mtimeMs === right.mtimeMs &&
    left.ctimeMs === right.ctimeMs
  )
}

function serializeJson(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`
}

function sha256(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex')
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0
}

function requireExecutionUid(): number {
  const uid = typeof process.getuid === 'function' ? process.getuid() : null
  if (!Number.isSafeInteger(uid) || (uid as number) < 0) {
    throw new GoldMasterPreviewVerificationFileError()
  }
  return uid as number
}

const executedPath = process.argv[1]
if (executedPath && import.meta.url === pathToFileURL(executedPath).href) {
  void runGoldMasterPreviewVerification(process.argv.slice(2), process.cwd()).then((code) => {
    process.exitCode = code
  })
}
