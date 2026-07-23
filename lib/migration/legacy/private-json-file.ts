/**
 * @design_doc   docs/LEGACY_DATA_MIGRATION_RUNBOOK.md private canonical migration inputs
 * @related_to   preview-import-runner.ts parses owner-only manifest, export, and control JSON
 * @known_issues Canonical JSON is bounded but must remain in memory for the current transformer
 */
import { constants, type Stats } from 'node:fs'
import { lstat, open, realpath } from 'node:fs/promises'
import { isAbsolute, parse, resolve } from 'node:path'
import { TextDecoder } from 'node:util'

const MAXIMUM_PRIVATE_JSON_BYTES = 512 * 1024 * 1024

export interface LegacyPrivateJsonPermissionMetadata {
  uid: number
  mode: number
}

export function hasPrivateLegacyJsonPermissions(
  metadata: LegacyPrivateJsonPermissionMetadata,
  executionUid: number
): boolean {
  return (
    Number.isSafeInteger(metadata.uid) &&
    metadata.uid >= 0 &&
    Number.isSafeInteger(metadata.mode) &&
    metadata.mode >= 0 &&
    Number.isSafeInteger(executionUid) &&
    executionUid >= 0 &&
    metadata.uid === executionUid &&
    (metadata.mode & 0o077) === 0 &&
    (metadata.mode & 0o400) !== 0
  )
}

export async function readPrivateLegacyJsonText(
  filePath: string,
  maximumBytes: number
): Promise<string> {
  try {
    const executionUid = requireExecutionUid()
    validateRequest(filePath, maximumBytes)
    const absolutePath = resolve(filePath)
    const beforeStats = await lstat(absolutePath)
    if (!isPrivateRegularFile(beforeStats, executionUid) || beforeStats.size > maximumBytes) {
      throw privateJsonError()
    }
    const canonicalPath = await realpath(absolutePath)
    const canonicalStats = await lstat(canonicalPath)
    if (
      !isPrivateRegularFile(canonicalStats, executionUid) ||
      !isSameStableFile(beforeStats, canonicalStats)
    ) {
      throw privateJsonError()
    }

    const text = await readBoundedUtf8(canonicalPath, canonicalStats, maximumBytes, executionUid)
    const afterStats = await lstat(absolutePath)
    if (
      !isPrivateRegularFile(afterStats, executionUid) ||
      !isSameStableFile(beforeStats, afterStats)
    ) {
      throw privateJsonError()
    }
    return text
  } catch {
    throw privateJsonError()
  }
}

function validateRequest(filePath: string, maximumBytes: number): void {
  if (
    typeof filePath !== 'string' ||
    filePath.length === 0 ||
    filePath.length > 4096 ||
    !isAbsolute(filePath) ||
    filePath.includes('\\') ||
    filePath.includes('\0') ||
    resolve(filePath) !== filePath ||
    parse(filePath).root === filePath ||
    !filePath.endsWith('.json') ||
    !Number.isSafeInteger(maximumBytes) ||
    maximumBytes < 1 ||
    maximumBytes > MAXIMUM_PRIVATE_JSON_BYTES
  ) {
    throw privateJsonError()
  }
}

async function readBoundedUtf8(
  absolutePath: string,
  expectedStats: Stats,
  maximumBytes: number,
  executionUid: number
): Promise<string> {
  const handle = await open(absolutePath, constants.O_RDONLY | constants.O_NOFOLLOW)
  try {
    const openedStats = await handle.stat()
    if (
      !isPrivateRegularFile(openedStats, executionUid) ||
      !isSameStableFile(expectedStats, openedStats)
    ) {
      throw privateJsonError()
    }

    const decoder = new TextDecoder('utf-8', { fatal: true })
    const textChunks: string[] = []
    let byteCount = 0
    const stream = handle.createReadStream({ autoClose: false })
    for await (const chunk of stream) {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as Uint8Array)
      byteCount += buffer.byteLength
      if (!Number.isSafeInteger(byteCount) || byteCount > maximumBytes) throw privateJsonError()
      textChunks.push(decoder.decode(buffer, { stream: true }))
    }
    textChunks.push(decoder.decode())
    if (byteCount !== openedStats.size) throw privateJsonError()
    return textChunks.join('')
  } finally {
    await handle.close()
  }
}

function isPrivateRegularFile(stats: Stats, executionUid: number): boolean {
  return (
    stats.isFile() &&
    !stats.isSymbolicLink() &&
    hasPrivateLegacyJsonPermissions(stats, executionUid)
  )
}

function isSameStableFile(left: Stats, right: Stats): boolean {
  return (
    left.dev === right.dev &&
    left.ino === right.ino &&
    left.size === right.size &&
    left.uid === right.uid &&
    left.mode === right.mode &&
    left.mtimeMs === right.mtimeMs &&
    left.ctimeMs === right.ctimeMs
  )
}

function requireExecutionUid(): number {
  const executionUid = typeof process.getuid === 'function' ? process.getuid() : null
  if (!Number.isSafeInteger(executionUid) || (executionUid as number) < 0) {
    throw privateJsonError()
  }
  return executionUid as number
}

function privateJsonError(): Error {
  return new Error('Private migration JSON access was rejected.')
}
