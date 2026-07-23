/**
 * @design_doc   docs/LEGACY_DATA_MIGRATION_RUNBOOK.md offline snapshot-package filesystem gate
 * @related_to   snapshot-package.ts verifies checksums and row counts returned by this adapter
 * @known_issues Filesystem race resistance is limited to ownership/mode checks, realpath, lstat, O_NOFOLLOW, and inode checks
 */
import { createHash, type Hash } from 'node:crypto'
import { constants, type Stats } from 'node:fs'
import { lstat, open, realpath } from 'node:fs/promises'
import { isAbsolute, parse, relative, resolve, sep } from 'node:path'
import { Readable } from 'node:stream'
import { TextDecoder } from 'node:util'
import { createGunzip } from 'node:zlib'

import type {
  LegacySnapshotArtifactKind,
  LegacySnapshotFileInspection,
  LegacySnapshotPackageIo,
} from './snapshot-package'

export interface LegacySnapshotPackageFilesystem extends LegacySnapshotPackageIo {
  readTextFile: (relativePath: string, maximumBytes: number) => Promise<string>
}

interface ResolvedPackageFile {
  absolutePath: string
  stats: Stats
}

interface ResolvedPackageRoot {
  absolutePath: string
  stats: Stats
  executionUid: number
}

export interface LegacySnapshotPermissionMetadata {
  uid: number
  mode: number
}

interface StreamInspection {
  sizeBytes: number
  sha256: string
  rowCount?: number
}

const MAXIMUM_CONTROL_FILE_BYTES = 4 * 1024 * 1024
const MAXIMUM_PACKAGE_JSON_BYTES = 512 * 1024 * 1024
const SAFE_RELATIVE_PATH_PATTERN = /^[A-Za-z0-9._/-]+$/u
const NON_WHITESPACE_PATTERN = /\S/u

export function hasPrivateSnapshotPermissions(
  metadata: LegacySnapshotPermissionMetadata,
  executionUid: number,
  kind: 'directory' | 'file'
): boolean {
  if (
    !Number.isSafeInteger(metadata.uid) ||
    metadata.uid < 0 ||
    !Number.isSafeInteger(metadata.mode) ||
    metadata.mode < 0 ||
    !Number.isSafeInteger(executionUid) ||
    executionUid < 0 ||
    metadata.uid !== executionUid
  ) {
    return false
  }
  const permissionBits = metadata.mode & 0o777
  if ((permissionBits & 0o077) !== 0) return false
  const requiredOwnerPermissions = kind === 'directory' ? 0o500 : 0o400
  return (permissionBits & requiredOwnerPermissions) === requiredOwnerPermissions
}

export async function createLegacySnapshotPackageFilesystem(
  rootPath: string
): Promise<LegacySnapshotPackageFilesystem> {
  try {
    const executionUid = requireExecutionUid()
    const packageRoot = await resolvePackageRoot(rootPath, executionUid)
    return {
      inspectFile: async (relativePath, kind) => {
        try {
          await assertStablePackageRoot(packageRoot)
          const inspection = await inspectPackageFile(
            packageRoot.absolutePath,
            relativePath,
            kind,
            executionUid
          )
          await assertStablePackageRoot(packageRoot)
          return inspection
        } catch {
          throw packageFilesystemError()
        }
      },
      readTextFile: async (relativePath, maximumBytes) => {
        try {
          if (!relativePath.endsWith('.json')) throw packageFilesystemError()
          await assertStablePackageRoot(packageRoot)
          const text = await readPackageTextFile(
            packageRoot.absolutePath,
            relativePath,
            maximumBytes,
            executionUid
          )
          await assertStablePackageRoot(packageRoot)
          return text
        } catch {
          throw packageFilesystemError()
        }
      },
    }
  } catch {
    throw packageFilesystemError()
  }
}

export async function readLegacySnapshotPolicyText(
  policyPath: string,
  maximumBytes: number
): Promise<string> {
  try {
    const executionUid = requireExecutionUid()
    requireValidMaximumBytes(maximumBytes, MAXIMUM_CONTROL_FILE_BYTES)
    if (
      typeof policyPath !== 'string' ||
      !isAbsolute(policyPath) ||
      policyPath.includes('\\') ||
      policyPath.includes('\0') ||
      !policyPath.endsWith('.json')
    ) {
      throw policyFilesystemError()
    }
    const absolutePath = resolve(policyPath)
    const pathStats = await lstat(absolutePath)
    if (
      pathStats.isSymbolicLink() ||
      !pathStats.isFile() ||
      !hasPrivateSnapshotPermissions(pathStats, executionUid, 'file')
    ) {
      throw policyFilesystemError()
    }
    const canonicalPath = await realpath(absolutePath)
    const canonicalStats = await lstat(canonicalPath)
    if (
      canonicalStats.isSymbolicLink() ||
      !hasPrivateSnapshotPermissions(canonicalStats, executionUid, 'file') ||
      !isSameInode(pathStats, canonicalStats)
    ) {
      throw policyFilesystemError()
    }

    const text = await readStableUtf8File(canonicalPath, canonicalStats, maximumBytes, executionUid)
    const afterStats = await lstat(absolutePath)
    if (
      !isSameStableFile(pathStats, afterStats) ||
      afterStats.isSymbolicLink() ||
      !hasPrivateSnapshotPermissions(afterStats, executionUid, 'file')
    ) {
      throw policyFilesystemError()
    }
    return text
  } catch {
    throw policyFilesystemError()
  }
}

async function resolvePackageRoot(
  rootPath: string,
  executionUid: number
): Promise<ResolvedPackageRoot> {
  if (typeof rootPath !== 'string' || !isAbsolute(rootPath) || rootPath.includes('\0')) {
    throw packageFilesystemError()
  }
  const requestedRoot = resolve(rootPath)
  if (parse(requestedRoot).root === requestedRoot) throw packageFilesystemError()

  const requestedStats = await lstat(requestedRoot)
  if (
    requestedStats.isSymbolicLink() ||
    !requestedStats.isDirectory() ||
    !hasPrivateSnapshotPermissions(requestedStats, executionUid, 'directory')
  ) {
    throw packageFilesystemError()
  }
  const canonicalRoot = await realpath(requestedRoot)
  if (parse(canonicalRoot).root === canonicalRoot) throw packageFilesystemError()
  const canonicalStats = await lstat(canonicalRoot)
  if (
    canonicalStats.isSymbolicLink() ||
    !canonicalStats.isDirectory() ||
    !hasPrivateSnapshotPermissions(canonicalStats, executionUid, 'directory') ||
    !isSameInode(requestedStats, canonicalStats)
  ) {
    throw packageFilesystemError()
  }
  return { absolutePath: canonicalRoot, stats: canonicalStats, executionUid }
}

async function assertStablePackageRoot(packageRoot: ResolvedPackageRoot): Promise<void> {
  const currentStats = await lstat(packageRoot.absolutePath)
  if (
    currentStats.isSymbolicLink() ||
    !currentStats.isDirectory() ||
    !hasPrivateSnapshotPermissions(currentStats, packageRoot.executionUid, 'directory') ||
    !isSameStableDirectory(packageRoot.stats, currentStats) ||
    (await realpath(packageRoot.absolutePath)) !== packageRoot.absolutePath
  ) {
    throw packageFilesystemError()
  }
}

async function inspectPackageFile(
  canonicalRoot: string,
  relativePath: string,
  kind: LegacySnapshotArtifactKind,
  executionUid: number
): Promise<LegacySnapshotFileInspection> {
  const before = await resolveRegularPackageFile(canonicalRoot, relativePath, executionUid)
  const inspection = await streamFileInspection(
    before.absolutePath,
    before.stats,
    kind,
    executionUid
  )
  const after = await resolveRegularPackageFile(canonicalRoot, relativePath, executionUid)
  if (!isSameStableFile(before.stats, after.stats)) throw packageFilesystemError()
  return {
    isFile: true,
    isSymbolicLink: false,
    sizeBytes: inspection.sizeBytes,
    sha256: inspection.sha256,
    ...(inspection.rowCount !== undefined ? { rowCount: inspection.rowCount } : {}),
  }
}

async function readPackageTextFile(
  canonicalRoot: string,
  relativePath: string,
  maximumBytes: number,
  executionUid: number
): Promise<string> {
  requireValidMaximumBytes(maximumBytes, MAXIMUM_PACKAGE_JSON_BYTES)
  const before = await resolveRegularPackageFile(canonicalRoot, relativePath, executionUid)
  const text = await readStableUtf8File(
    before.absolutePath,
    before.stats,
    maximumBytes,
    executionUid
  )
  const after = await resolveRegularPackageFile(canonicalRoot, relativePath, executionUid)
  if (!isSameStableFile(before.stats, after.stats)) throw packageFilesystemError()
  return text
}

async function resolveRegularPackageFile(
  canonicalRoot: string,
  relativePath: string,
  executionUid: number
): Promise<ResolvedPackageFile> {
  const segments = validateRelativePath(relativePath)
  const candidatePath = resolve(canonicalRoot, relativePath)
  requireContainedPath(canonicalRoot, candidatePath)

  let cursor = canonicalRoot
  let stats: Stats | null = null
  for (const segment of segments) {
    cursor = resolve(cursor, segment)
    stats = await lstat(cursor)
    if (stats.isSymbolicLink()) throw packageFilesystemError()
  }
  if (!stats?.isFile() || !hasPrivateSnapshotPermissions(stats, executionUid, 'file')) {
    throw packageFilesystemError()
  }

  const canonicalPath = await realpath(candidatePath)
  requireContainedPath(canonicalRoot, canonicalPath)
  if (canonicalPath !== candidatePath) throw packageFilesystemError()
  return { absolutePath: canonicalPath, stats }
}

function validateRelativePath(relativePath: string): string[] {
  if (
    typeof relativePath !== 'string' ||
    relativePath.length === 0 ||
    relativePath.length > 512 ||
    isAbsolute(relativePath) ||
    relativePath.includes('\\') ||
    relativePath.includes('\0') ||
    relativePath !== relativePath.normalize('NFKC') ||
    !SAFE_RELATIVE_PATH_PATTERN.test(relativePath)
  ) {
    throw packageFilesystemError()
  }
  const segments = relativePath.split('/')
  if (segments.some((segment) => segment.length === 0 || segment === '.' || segment === '..')) {
    throw packageFilesystemError()
  }
  return segments
}

function requireContainedPath(canonicalRoot: string, candidatePath: string): void {
  const pathFromRoot = relative(canonicalRoot, candidatePath)
  if (
    pathFromRoot.length === 0 ||
    pathFromRoot === '..' ||
    pathFromRoot.startsWith(`..${sep}`) ||
    isAbsolute(pathFromRoot)
  ) {
    throw packageFilesystemError()
  }
}

async function streamFileInspection(
  absolutePath: string,
  expectedStats: Stats,
  kind: LegacySnapshotArtifactKind,
  executionUid: number
): Promise<StreamInspection> {
  const handle = await open(absolutePath, constants.O_RDONLY | constants.O_NOFOLLOW)
  try {
    const openedStats = await handle.stat()
    if (
      !openedStats.isFile() ||
      !hasPrivateSnapshotPermissions(openedStats, executionUid, 'file') ||
      !isSameStableFile(expectedStats, openedStats)
    ) {
      throw packageFilesystemError()
    }

    const hash = createHash('sha256')
    const byteCounter = { value: 0 }
    const source = handle.createReadStream({ autoClose: false })
    const hashingStream = Readable.from(hashRawChunks(source, hash, byteCounter))
    const shouldCountRows = kind === 'table'
    const contentStream =
      shouldCountRows && absolutePath.endsWith('.gz')
        ? hashingStream.pipe(createGunzip())
        : hashingStream
    const rowCount = shouldCountRows
      ? await countNonblankRows(contentStream)
      : await drain(contentStream)

    if (byteCounter.value !== openedStats.size) throw packageFilesystemError()
    return {
      sizeBytes: byteCounter.value,
      sha256: hash.digest('hex'),
      ...(typeof rowCount === 'number' ? { rowCount } : {}),
    }
  } finally {
    await handle.close()
  }
}

async function* hashRawChunks(
  source: AsyncIterable<unknown>,
  hash: Hash,
  byteCounter: { value: number }
): AsyncGenerator<Buffer> {
  for await (const chunk of source) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as Uint8Array)
    if (!Number.isSafeInteger(byteCounter.value + buffer.byteLength)) {
      throw packageFilesystemError()
    }
    byteCounter.value += buffer.byteLength
    hash.update(buffer)
    yield buffer
  }
}

async function countNonblankRows(source: AsyncIterable<unknown>): Promise<number> {
  const decoder = new TextDecoder('utf-8', { fatal: true })
  let rowCount = 0
  let lineHasContent = false

  const inspectText = (text: string): void => {
    for (const character of text) {
      if (character === '\n') {
        if (lineHasContent) {
          if (!Number.isSafeInteger(rowCount + 1)) throw packageFilesystemError()
          rowCount += 1
        }
        lineHasContent = false
      } else if (NON_WHITESPACE_PATTERN.test(character)) {
        lineHasContent = true
      }
    }
  }

  for await (const chunk of source) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as Uint8Array)
    inspectText(decoder.decode(buffer, { stream: true }))
  }
  inspectText(decoder.decode())
  if (lineHasContent) {
    if (!Number.isSafeInteger(rowCount + 1)) throw packageFilesystemError()
    rowCount += 1
  }
  return rowCount
}

async function drain(source: AsyncIterable<unknown>): Promise<void> {
  for await (const _chunk of source) {
    // Iteration deliberately drains the stream so the hash covers the complete artifact.
  }
}

async function readStableUtf8File(
  absolutePath: string,
  expectedStats: Stats,
  maximumBytes: number,
  executionUid: number
): Promise<string> {
  if (
    !Number.isSafeInteger(expectedStats.size) ||
    expectedStats.size < 0 ||
    expectedStats.size > maximumBytes
  ) {
    throw packageFilesystemError()
  }

  const handle = await open(absolutePath, constants.O_RDONLY | constants.O_NOFOLLOW)
  try {
    const openedStats = await handle.stat()
    if (
      !openedStats.isFile() ||
      !hasPrivateSnapshotPermissions(openedStats, executionUid, 'file') ||
      !isSameStableFile(expectedStats, openedStats)
    ) {
      throw packageFilesystemError()
    }
    const chunks: Buffer[] = []
    let byteCount = 0
    const stream = handle.createReadStream({ autoClose: false })
    for await (const chunk of stream) {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as Uint8Array)
      byteCount += buffer.byteLength
      if (!Number.isSafeInteger(byteCount) || byteCount > maximumBytes) {
        throw packageFilesystemError()
      }
      chunks.push(buffer)
    }
    if (byteCount !== openedStats.size) throw packageFilesystemError()
    return new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks, byteCount))
  } finally {
    await handle.close()
  }
}

function requireValidMaximumBytes(maximumBytes: number, maximumAllowedBytes: number): void {
  if (
    !Number.isSafeInteger(maximumBytes) ||
    maximumBytes < 1 ||
    maximumBytes > maximumAllowedBytes
  ) {
    throw packageFilesystemError()
  }
}

function isSameInode(left: Stats, right: Stats): boolean {
  return left.dev === right.dev && left.ino === right.ino
}

function isSameStableFile(left: Stats, right: Stats): boolean {
  return (
    isSameInode(left, right) &&
    left.size === right.size &&
    left.uid === right.uid &&
    left.mode === right.mode &&
    left.mtimeMs === right.mtimeMs &&
    left.ctimeMs === right.ctimeMs
  )
}

function isSameStableDirectory(left: Stats, right: Stats): boolean {
  return (
    isSameInode(left, right) &&
    left.uid === right.uid &&
    left.mode === right.mode &&
    left.ctimeMs === right.ctimeMs
  )
}

function requireExecutionUid(): number {
  const executionUid = typeof process.getuid === 'function' ? process.getuid() : null
  if (!Number.isSafeInteger(executionUid) || (executionUid as number) < 0) {
    throw packageFilesystemError()
  }
  return executionUid as number
}

function packageFilesystemError(): Error {
  return new Error('Snapshot package filesystem access was rejected.')
}

function policyFilesystemError(): Error {
  return new Error('Snapshot policy filesystem access was rejected.')
}
