/**
 * @design_doc   docs/LEGACY_DATA_MIGRATION_RUNBOOK.md offline file workflow
 * @related_to   dry-run.ts produces transformed records and a redacted readiness report
 * @known_issues Canonical JSON extraction from MySQL remains a separate read-only operation
 */
import { constants, type Stats } from 'node:fs'
import { lstat, mkdir, open, realpath, unlink } from 'node:fs/promises'
import { dirname, isAbsolute, parse, relative, resolve } from 'node:path'
import { runLegacyMigrationDryRun } from './dry-run'
import { readPrivateLegacyJsonText } from './private-json-file'
import { parseStrictJson } from './strict-json'

export interface LegacyMigrationCliArgs {
  manifestPath: string
  exportPath: string
  outputPath: string
  reportPath: string
}

export interface LegacyMigrationFileIo {
  readPrivateText: (path: string, maximumBytes: number) => Promise<string>
  writePrivateText: (path: string, value: string) => Promise<void>
}

export interface LegacyMigrationFileRunResult {
  exitCode: 0 | 1 | 2
  readyForPersistence: boolean
  message: string
}

const FLAG_NAMES = ['--manifest', '--export', '--output', '--report'] as const
const PRIVATE_OUTPUT_DIRECTORIES = ['migration-data', 'migration-reports'] as const
const MAXIMUM_MANIFEST_BYTES = 4 * 1024 * 1024
const MAXIMUM_EXPORT_BYTES = 512 * 1024 * 1024
const MAXIMUM_OUTPUT_BYTES = 512 * 1024 * 1024

export function createLegacyMigrationDryRunFileIo(cwd: string): LegacyMigrationFileIo {
  return {
    readPrivateText: readPrivateLegacyJsonText,
    writePrivateText: (path, value) => writePrivateLegacyDryRunText(cwd, path, value),
  }
}

export function parseLegacyMigrationCliArgs(
  argv: string[],
  cwd: string = process.cwd()
): LegacyMigrationCliArgs {
  try {
    const values = new Map<string, string>()

    if (argv.length !== FLAG_NAMES.length * 2) throw argumentError()
    for (let index = 0; index < argv.length; index += 2) {
      const flag = argv[index]
      const value = argv[index + 1]
      if (!FLAG_NAMES.includes(flag as (typeof FLAG_NAMES)[number]) || !value) {
        throw argumentError()
      }
      if (values.has(flag)) throw argumentError()
      values.set(flag, value)
    }

    if (FLAG_NAMES.some((flag) => !values.has(flag))) throw argumentError()

    const outputPath = requirePathWithin(cwd, values.get('--output') as string, 'migration-data')
    const reportPath = requirePathWithin(cwd, values.get('--report') as string, 'migration-reports')

    return {
      manifestPath: resolve(cwd, values.get('--manifest') as string),
      exportPath: resolve(cwd, values.get('--export') as string),
      outputPath,
      reportPath,
    }
  } catch {
    throw argumentError()
  }
}

export async function executeLegacyMigrationFileDryRun(
  argv: string[],
  cwd: string,
  io: LegacyMigrationFileIo
): Promise<LegacyMigrationFileRunResult> {
  let args: LegacyMigrationCliArgs
  try {
    args = parseLegacyMigrationCliArgs(argv, cwd)
  } catch {
    return {
      exitCode: 1,
      readyForPersistence: false,
      message: 'Legacy migration dry-run arguments were rejected.',
    }
  }

  let manifestInput: unknown
  let exportInput: unknown
  try {
    const [manifestText, exportText] = await Promise.all([
      io.readPrivateText(args.manifestPath, MAXIMUM_MANIFEST_BYTES),
      io.readPrivateText(args.exportPath, MAXIMUM_EXPORT_BYTES),
    ])
    manifestInput = parseStrictJson(manifestText, MAXIMUM_MANIFEST_BYTES)
    exportInput = parseStrictJson(exportText, MAXIMUM_EXPORT_BYTES)
  } catch {
    return {
      exitCode: 1,
      readyForPersistence: false,
      message: 'Legacy migration dry-run input was rejected.',
    }
  }

  const execution = runLegacyMigrationDryRun(manifestInput, exportInput)
  const reportDocument = execution.report ?? {
    readyForPersistence: false,
    inputIssues: execution.inputIssues,
  }

  try {
    await io.writePrivateText(args.reportPath, serializeJson(reportDocument))
    if (execution.result) {
      await io.writePrivateText(args.outputPath, serializeJson(execution.result))
    }
  } catch {
    return {
      exitCode: 1,
      readyForPersistence: false,
      message: 'Legacy migration dry-run output was rejected.',
    }
  }

  if (!execution.transformed) {
    return {
      exitCode: 1,
      readyForPersistence: false,
      message: 'Legacy export validation failed. Review the redacted report.',
    }
  }

  if (!execution.readyForPersistence) {
    return {
      exitCode: 2,
      readyForPersistence: false,
      message: 'Dry run completed with persistence blockers. Review the redacted report.',
    }
  }

  return {
    exitCode: 0,
    readyForPersistence: true,
    message: 'Dry run completed with no current persistence blockers.',
  }
}

function requirePathWithin(cwd: string, requestedPath: string, directory: string): string {
  const base = resolve(cwd, directory)
  const target = resolve(cwd, requestedPath)
  const pathFromBase = relative(base, target)
  if (
    !pathFromBase ||
    pathFromBase.includes('/') ||
    pathFromBase.includes('\\') ||
    pathFromBase.includes('\0') ||
    pathFromBase !== pathFromBase.normalize('NFKC') ||
    !pathFromBase.endsWith('.json') ||
    pathFromBase.startsWith('..') ||
    isAbsolute(pathFromBase)
  ) {
    throw argumentError()
  }
  return target
}

function serializeJson(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`
}

async function writePrivateLegacyDryRunText(
  cwd: string,
  targetPath: string,
  value: string
): Promise<void> {
  let handle: Awaited<ReturnType<typeof open>> | null = null
  let createdIdentity: Pick<Stats, 'dev' | 'ino'> | null = null
  let canonicalTargetPath: string | null = null
  try {
    if (typeof value !== 'string' || Buffer.byteLength(value, 'utf8') > MAXIMUM_OUTPUT_BYTES) {
      throw outputError()
    }
    const executionUid = requireExecutionUid()
    const absoluteCwd = resolve(cwd)
    if (!isAbsolute(cwd) || absoluteCwd !== cwd || parse(absoluteCwd).root === absoluteCwd) {
      throw outputError()
    }
    const canonicalCwd = await realpath(absoluteCwd)

    const { outputDirectory, outputFilename } = resolvePrivateOutputDirectory(
      absoluteCwd,
      canonicalCwd,
      targetPath
    )
    canonicalTargetPath = resolve(outputDirectory, outputFilename)
    try {
      await mkdir(outputDirectory, { mode: 0o700 })
    } catch {
      // An existing directory is accepted only after the guarded lstat checks below.
    }
    const directoryBefore = await lstat(outputDirectory)
    if (
      !isPrivateOutputDirectory(directoryBefore, executionUid) ||
      (await realpath(outputDirectory)) !== outputDirectory
    ) {
      throw outputError()
    }

    handle = await open(
      canonicalTargetPath,
      constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW,
      0o600
    )
    const openedStats = await handle.stat()
    createdIdentity = openedStats
    if (!isPrivateOutputFile(openedStats, executionUid)) throw outputError()

    await handle.writeFile(value, 'utf8')
    await handle.sync()
    const completedStats = await handle.stat()
    if (
      !isPrivateOutputFile(completedStats, executionUid) ||
      completedStats.size !== Buffer.byteLength(value, 'utf8') ||
      !isSameIdentity(openedStats, completedStats)
    ) {
      throw outputError()
    }
    await handle.close()
    handle = null

    const [directoryAfter, targetAfter] = await Promise.all([
      lstat(outputDirectory),
      lstat(canonicalTargetPath),
    ])
    if (
      !isPrivateOutputDirectory(directoryAfter, executionUid) ||
      !isSameIdentity(directoryBefore, directoryAfter) ||
      (await realpath(outputDirectory)) !== outputDirectory ||
      !isPrivateOutputFile(targetAfter, executionUid) ||
      !isSameIdentity(completedStats, targetAfter) ||
      (await realpath(canonicalTargetPath)) !== canonicalTargetPath
    ) {
      throw outputError()
    }
  } catch {
    if (handle) {
      try {
        await handle.close()
      } catch {
        // Cleanup below still verifies the created inode before unlinking it.
      }
    }
    if (createdIdentity && canonicalTargetPath) {
      await removeCreatedOutput(canonicalTargetPath, createdIdentity)
    }
    throw outputError()
  }
}

function resolvePrivateOutputDirectory(
  requestedCwd: string,
  canonicalCwd: string,
  targetPath: string
): { outputDirectory: string; outputFilename: string } {
  if (
    typeof targetPath !== 'string' ||
    !isAbsolute(targetPath) ||
    resolve(targetPath) !== targetPath ||
    !targetPath.endsWith('.json') ||
    targetPath.includes('\\') ||
    targetPath.includes('\0')
  ) {
    throw outputError()
  }
  const targetDirectory = dirname(targetPath)
  const allowedDirectory = PRIVATE_OUTPUT_DIRECTORIES.find(
    (directory) => resolve(requestedCwd, directory) === targetDirectory
  )
  if (!allowedDirectory) throw outputError()
  return {
    outputDirectory: resolve(canonicalCwd, allowedDirectory),
    outputFilename: targetPath.slice(targetDirectory.length + 1),
  }
}

function isPrivateOutputDirectory(stats: Stats, executionUid: number): boolean {
  return (
    stats.isDirectory() &&
    !stats.isSymbolicLink() &&
    stats.uid === executionUid &&
    (stats.mode & 0o777) === 0o700
  )
}

function isPrivateOutputFile(stats: Stats, executionUid: number): boolean {
  return (
    stats.isFile() &&
    !stats.isSymbolicLink() &&
    stats.uid === executionUid &&
    (stats.mode & 0o777) === 0o600
  )
}

function isSameIdentity(
  left: Pick<Stats, 'dev' | 'ino'>,
  right: Pick<Stats, 'dev' | 'ino'>
): boolean {
  return left.dev === right.dev && left.ino === right.ino
}

async function removeCreatedOutput(
  targetPath: string,
  createdIdentity: Pick<Stats, 'dev' | 'ino'>
): Promise<void> {
  try {
    const currentStats = await lstat(targetPath)
    if (currentStats.isFile() && isSameIdentity(currentStats, createdIdentity)) {
      await unlink(targetPath)
    }
  } catch {
    // The public failure stays generic; a pre-existing or replaced target is never removed.
  }
}

function requireExecutionUid(): number {
  const executionUid = typeof process.getuid === 'function' ? process.getuid() : null
  if (!Number.isSafeInteger(executionUid) || (executionUid as number) < 0) throw outputError()
  return executionUid as number
}

function argumentError(): Error {
  return new Error('Legacy migration dry-run arguments were rejected.')
}

function outputError(): Error {
  return new Error('Private migration dry-run output was rejected.')
}
