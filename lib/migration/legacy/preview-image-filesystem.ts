/**
 * @design_doc   docs/LEGACY_DATA_MIGRATION_RUNBOOK.md preview image filesystem adapter
 * @related_to   preview-image-import.ts coordinates preflight verification, exclusive copies, and rollback
 * @known_issues This local adapter assumes the provisioned preview roots are not writable by untrusted users
 */
import { constants } from 'node:fs'
import { createHash } from 'node:crypto'
import { lstat, mkdir, open, readdir, realpath, unlink } from 'node:fs/promises'
import { isAbsolute, relative, resolve, sep } from 'node:path'

import type {
  LegacyImageInspection,
  LegacyPublicImageMediaType,
  LegacyPublicImageManifestEntry,
} from './image-manifest'
import type {
  LegacyPreviewImageImportIo,
  LegacyPreviewImageTargetIdentity,
} from './preview-image-import'

const DEFAULT_TARGET_MARKER_FILE = '.legacy-preview-target.json'
const MAX_MARKER_BYTES = 4096
const MAX_IMAGE_HEADER_BYTES = 1024 * 1024

export interface LegacyPreviewImageFilesystemOptions {
  sourceRoot: string
  targetRoot: string
  targetMarkerFile?: string
}

interface VerifiedRoots {
  sourceRoot: string
  targetRoot: string
}

interface CreatedFileIdentity {
  device: bigint
  inode: bigint
  sha256: string
  sizeBytes: number
}

export function createLegacyPreviewImageFilesystemIo(
  options: LegacyPreviewImageFilesystemOptions
): LegacyPreviewImageImportIo {
  const configuredSourceRoot = validateConfiguredRoot(options.sourceRoot)
  const configuredTargetRoot = validateConfiguredRoot(options.targetRoot)
  const markerFile = validateMarkerFile(options.targetMarkerFile ?? DEFAULT_TARGET_MARKER_FILE)
  const createdFiles = new Map<string, CreatedFileIdentity>()

  async function verifiedRoots(): Promise<VerifiedRoots> {
    const [sourceRoot, targetRoot] = await Promise.all([
      verifyRoot(configuredSourceRoot),
      verifyRoot(configuredTargetRoot),
    ])
    if (
      sourceRoot === targetRoot ||
      isContained(sourceRoot, targetRoot) ||
      isContained(targetRoot, sourceRoot)
    ) {
      throw new LegacyPreviewImageFilesystemError()
    }
    return { sourceRoot, targetRoot }
  }

  return {
    async inspectTargetIdentity(): Promise<LegacyPreviewImageTargetIdentity> {
      const { targetRoot } = await verifiedRoots()
      const markerPath = resolveContained(targetRoot, markerFile)
      const markerStat = await lstat(markerPath, { bigint: true })
      if (
        markerStat.isSymbolicLink() ||
        !markerStat.isFile() ||
        markerStat.size > MAX_MARKER_BYTES
      ) {
        throw new LegacyPreviewImageFilesystemError()
      }
      const markerRealPath = await realpath(markerPath)
      if (!isContained(targetRoot, markerRealPath)) throw new LegacyPreviewImageFilesystemError()

      const markerHandle = await open(markerPath, constants.O_RDONLY | constants.O_NOFOLLOW)
      let contents: string
      try {
        contents = await markerHandle.readFile({ encoding: 'utf8' })
      } finally {
        await markerHandle.close()
      }
      const marker = parseTargetMarker(contents)
      return { realRoot: targetRoot, environment: marker.environment, targetId: marker.targetId }
    },

    async inspectTargetInventory(): Promise<string[]> {
      const { targetRoot } = await verifiedRoots()
      const files = await listTargetFiles(targetRoot, targetRoot)
      await verifyRoot(configuredTargetRoot)
      return files
        .filter((relativePath) => relativePath !== markerFile)
        .sort((left, right) => left.localeCompare(right, 'en'))
    },

    async inspectSource(file): Promise<LegacyImageInspection> {
      const { sourceRoot } = await verifiedRoots()
      return inspectExistingFile(sourceRoot, file.sourcePath)
    },

    async inspectTarget(file): Promise<LegacyImageInspection | null> {
      const { targetRoot } = await verifiedRoots()
      const parentsExist = await verifyParentComponents(targetRoot, file.targetPath, true)
      if (!parentsExist) return null
      const targetPath = resolveContained(targetRoot, file.targetPath)
      let targetStat
      try {
        targetStat = await lstat(targetPath, { bigint: true })
      } catch (error) {
        if (isMissingFileError(error)) return null
        throw error
      }
      if (targetStat.isSymbolicLink()) {
        return {
          isFile: false,
          isSymbolicLink: true,
          sizeBytes: safeSize(targetStat.size),
          sha256: '',
          mediaType: null,
          width: null,
          height: null,
        }
      }
      if (!targetStat.isFile()) {
        return {
          isFile: false,
          isSymbolicLink: false,
          sizeBytes: safeSize(targetStat.size),
          sha256: '',
          mediaType: null,
          width: null,
          height: null,
        }
      }
      return inspectRegularFile(targetRoot, targetPath, targetStat.dev, targetStat.ino)
    },

    async copyExclusive(file): Promise<LegacyImageInspection> {
      const roots = await verifiedRoots()
      const sourceInspection = await inspectExistingFile(roots.sourceRoot, file.sourcePath)
      if (
        !sourceInspection.isFile ||
        sourceInspection.isSymbolicLink ||
        sourceInspection.sizeBytes !== file.sizeBytes ||
        sourceInspection.sha256 !== file.sha256
      ) {
        throw new LegacyPreviewImageFilesystemError()
      }

      const sourcePath = resolveContained(roots.sourceRoot, file.sourcePath)
      await verifyParentComponents(roots.sourceRoot, file.sourcePath, false)
      await createVerifiedParents(roots.targetRoot, file.targetPath)
      const targetPath = resolveContained(roots.targetRoot, file.targetPath)

      let sourceHandle: Awaited<ReturnType<typeof open>> | null = null
      let targetHandle: Awaited<ReturnType<typeof open>> | null = null
      let created = false
      try {
        sourceHandle = await open(sourcePath, constants.O_RDONLY | constants.O_NOFOLLOW)
        const sourceStat = await sourceHandle.stat({ bigint: true })
        if (!sourceStat.isFile()) throw new LegacyPreviewImageFilesystemError()
        targetHandle = await open(
          targetPath,
          constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY | constants.O_NOFOLLOW,
          0o640
        )
        created = true
        await copyHandlesStreaming(sourceHandle, targetHandle)
        await targetHandle.sync()
        const targetStat = await targetHandle.stat({ bigint: true })
        await targetHandle.close()
        targetHandle = null
        await sourceHandle.close()
        sourceHandle = null

        const inspection = await inspectRegularFile(
          roots.targetRoot,
          targetPath,
          targetStat.dev,
          targetStat.ino
        )
        createdFiles.set(file.targetPath, {
          device: targetStat.dev,
          inode: targetStat.ino,
          sha256: inspection.sha256,
          sizeBytes: inspection.sizeBytes,
        })
        return inspection
      } catch (error) {
        await cleanupFailedCopy(sourceHandle, targetHandle, created ? targetPath : null)
        throw error
      }
    },

    async rollbackCreated(file): Promise<void> {
      const roots = await verifiedRoots()
      const created = createdFiles.get(file.targetPath)
      if (!created) throw new LegacyPreviewImageFilesystemError()
      await verifyParentComponents(roots.targetRoot, file.targetPath, false)
      const targetPath = resolveContained(roots.targetRoot, file.targetPath)
      const targetStat = await lstat(targetPath, { bigint: true })
      if (
        targetStat.isSymbolicLink() ||
        !targetStat.isFile() ||
        targetStat.dev !== created.device ||
        targetStat.ino !== created.inode
      ) {
        throw new LegacyPreviewImageFilesystemError()
      }
      const inspection = await inspectRegularFile(
        roots.targetRoot,
        targetPath,
        targetStat.dev,
        targetStat.ino
      )
      if (
        inspection.sha256 !== created.sha256 ||
        inspection.sizeBytes !== created.sizeBytes ||
        inspection.sha256 !== file.sha256 ||
        inspection.sizeBytes !== file.sizeBytes
      ) {
        throw new LegacyPreviewImageFilesystemError()
      }
      await unlink(targetPath)
      createdFiles.delete(file.targetPath)
    },
  }
}

async function listTargetFiles(root: string, directory: string): Promise<string[]> {
  const files: string[] = []
  const entries = await readdir(directory, { withFileTypes: true })
  for (const entry of entries) {
    const candidate = resolve(directory, entry.name)
    if (!isContained(root, candidate)) throw new LegacyPreviewImageFilesystemError()
    const stats = await lstat(candidate)
    if (stats.isSymbolicLink()) throw new LegacyPreviewImageFilesystemError()
    const realCandidate = await realpath(candidate)
    if (realCandidate !== candidate || !isContained(root, realCandidate)) {
      throw new LegacyPreviewImageFilesystemError()
    }
    if (stats.isDirectory()) {
      files.push(...(await listTargetFiles(root, candidate)))
      continue
    }
    if (!stats.isFile()) throw new LegacyPreviewImageFilesystemError()
    const relativePath = relative(root, candidate).split(sep).join('/')
    if (!relativePath) throw new LegacyPreviewImageFilesystemError()
    files.push(relativePath)
  }
  return files
}

async function inspectExistingFile(
  root: string,
  relativePath: string
): Promise<LegacyImageInspection> {
  await verifyParentComponents(root, relativePath, false)
  const absolutePath = resolveContained(root, relativePath)
  const entryStat = await lstat(absolutePath, { bigint: true })
  if (entryStat.isSymbolicLink()) {
    return {
      isFile: false,
      isSymbolicLink: true,
      sizeBytes: safeSize(entryStat.size),
      sha256: '',
      mediaType: null,
      width: null,
      height: null,
    }
  }
  if (!entryStat.isFile()) {
    return {
      isFile: false,
      isSymbolicLink: false,
      sizeBytes: safeSize(entryStat.size),
      sha256: '',
      mediaType: null,
      width: null,
      height: null,
    }
  }
  return inspectRegularFile(root, absolutePath, entryStat.dev, entryStat.ino)
}

async function inspectRegularFile(
  root: string,
  absolutePath: string,
  expectedDevice: bigint,
  expectedInode: bigint
): Promise<LegacyImageInspection> {
  const realPath = await realpath(absolutePath)
  if (!isContained(root, realPath)) throw new LegacyPreviewImageFilesystemError()
  if (expectedDevice < BigInt(0) || expectedInode < BigInt(0)) {
    throw new LegacyPreviewImageFilesystemError()
  }
  const hash = createHash('sha256')
  let sizeBytes = 0
  const headerChunks: Buffer[] = []
  let headerBytes = 0
  const handle = await open(absolutePath, constants.O_RDONLY | constants.O_NOFOLLOW)
  try {
    const openedStat = await handle.stat({ bigint: true })
    if (
      !openedStat.isFile() ||
      openedStat.dev !== expectedDevice ||
      openedStat.ino !== expectedInode
    ) {
      throw new LegacyPreviewImageFilesystemError()
    }
    const buffer = Buffer.allocUnsafe(64 * 1024)
    while (true) {
      const { bytesRead } = await handle.read(buffer, 0, buffer.byteLength, null)
      if (bytesRead === 0) break
      const chunk = buffer.subarray(0, bytesRead)
      sizeBytes += bytesRead
      if (!Number.isSafeInteger(sizeBytes)) throw new LegacyPreviewImageFilesystemError()
      hash.update(chunk)
      if (headerBytes < MAX_IMAGE_HEADER_BYTES) {
        const captured = Buffer.from(chunk.subarray(0, MAX_IMAGE_HEADER_BYTES - headerBytes))
        headerChunks.push(captured)
        headerBytes += captured.byteLength
      }
    }
  } finally {
    await handle.close()
  }
  const after = await lstat(absolutePath, { bigint: true })
  if (
    after.isSymbolicLink() ||
    !after.isFile() ||
    after.dev !== expectedDevice ||
    after.ino !== expectedInode ||
    after.size > BigInt(Number.MAX_SAFE_INTEGER) ||
    BigInt(sizeBytes) !== after.size
  ) {
    throw new LegacyPreviewImageFilesystemError()
  }
  const afterRealPath = await realpath(absolutePath)
  if (!isContained(root, afterRealPath)) throw new LegacyPreviewImageFilesystemError()
  const metadata = detectImageMetadata(Buffer.concat(headerChunks, headerBytes))
  return {
    isFile: true,
    isSymbolicLink: false,
    sizeBytes,
    sha256: hash.digest('hex'),
    mediaType: metadata?.mediaType ?? null,
    width: metadata?.width ?? null,
    height: metadata?.height ?? null,
  }
}

async function copyHandlesStreaming(
  source: Awaited<ReturnType<typeof open>>,
  target: Awaited<ReturnType<typeof open>>
): Promise<void> {
  const buffer = Buffer.allocUnsafe(64 * 1024)
  while (true) {
    const { bytesRead } = await source.read(buffer, 0, buffer.byteLength, null)
    if (bytesRead === 0) return
    let written = 0
    while (written < bytesRead) {
      const result = await target.write(buffer, written, bytesRead - written, null)
      if (result.bytesWritten <= 0) throw new LegacyPreviewImageFilesystemError()
      written += result.bytesWritten
    }
  }
}

async function cleanupFailedCopy(
  source: Awaited<ReturnType<typeof open>> | null,
  target: Awaited<ReturnType<typeof open>> | null,
  createdPath: string | null
): Promise<void> {
  const failures: unknown[] = []
  for (const handle of [target, source]) {
    if (!handle) continue
    try {
      await handle.close()
    } catch (error) {
      failures.push(error)
    }
  }
  if (createdPath) {
    try {
      await unlink(createdPath)
    } catch (error) {
      failures.push(error)
    }
  }
  if (failures.length > 0) {
    throw new LegacyPreviewImageFilesystemError('Failed to clean partial image copy.', {
      cause: new AggregateError(failures),
    })
  }
}

interface DetectedImageMetadata {
  mediaType: LegacyPublicImageMediaType
  width: number
  height: number
}

function detectImageMetadata(header: Buffer): DetectedImageMetadata | null {
  return detectPngMetadata(header) ?? detectJpegMetadata(header) ?? detectWebpMetadata(header)
}

function detectPngMetadata(header: Buffer): DetectedImageMetadata | null {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  if (
    header.byteLength < 24 ||
    !header.subarray(0, signature.byteLength).equals(signature) ||
    header.toString('ascii', 12, 16) !== 'IHDR' ||
    header.readUInt32BE(8) !== 13
  ) {
    return null
  }
  return validMetadata('image/png', header.readUInt32BE(16), header.readUInt32BE(20))
}

function detectJpegMetadata(header: Buffer): DetectedImageMetadata | null {
  if (header.byteLength < 4 || header[0] !== 0xff || header[1] !== 0xd8) return null
  const startOfFrameMarkers = new Set([
    0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf,
  ])
  let offset = 2
  while (offset + 3 < header.byteLength) {
    if (header[offset] !== 0xff) return null
    while (offset < header.byteLength && header[offset] === 0xff) offset += 1
    if (offset >= header.byteLength) return null
    const marker = header[offset]
    offset += 1
    if (marker === 0xd9 || marker === 0xda) return null
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue
    if (offset + 1 >= header.byteLength) return null
    const segmentLength = header.readUInt16BE(offset)
    if (segmentLength < 2 || offset + segmentLength > header.byteLength) return null
    if (startOfFrameMarkers.has(marker)) {
      if (segmentLength < 7) return null
      return validMetadata(
        'image/jpeg',
        header.readUInt16BE(offset + 5),
        header.readUInt16BE(offset + 3)
      )
    }
    offset += segmentLength
  }
  return null
}

function detectWebpMetadata(header: Buffer): DetectedImageMetadata | null {
  if (
    header.byteLength < 30 ||
    header.toString('ascii', 0, 4) !== 'RIFF' ||
    header.toString('ascii', 8, 12) !== 'WEBP'
  ) {
    return null
  }
  const chunk = header.toString('ascii', 12, 16)
  if (chunk === 'VP8X') {
    return validMetadata('image/webp', 1 + readUInt24LE(header, 24), 1 + readUInt24LE(header, 27))
  }
  if (chunk === 'VP8L' && header[20] === 0x2f) {
    return validMetadata(
      'image/webp',
      1 + header[21] + ((header[22] & 0x3f) << 8),
      1 + (header[22] >> 6) + (header[23] << 2) + ((header[24] & 0x0f) << 10)
    )
  }
  if (chunk === 'VP8 ' && header[23] === 0x9d && header[24] === 0x01 && header[25] === 0x2a) {
    return validMetadata(
      'image/webp',
      header.readUInt16LE(26) & 0x3fff,
      header.readUInt16LE(28) & 0x3fff
    )
  }
  return null
}

function readUInt24LE(buffer: Buffer, offset: number): number {
  return buffer[offset] + (buffer[offset + 1] << 8) + (buffer[offset + 2] << 16)
}

function validMetadata(
  mediaType: LegacyPublicImageMediaType,
  width: number,
  height: number
): DetectedImageMetadata | null {
  return Number.isSafeInteger(width) && Number.isSafeInteger(height) && width > 0 && height > 0
    ? { mediaType, width, height }
    : null
}

async function createVerifiedParents(root: string, relativePath: string): Promise<void> {
  const segments = validateRelativePath(relativePath).split('/').slice(0, -1)
  let current = root
  for (const segment of segments) {
    current = resolve(current, segment)
    try {
      await mkdir(current, { mode: 0o750 })
    } catch (error) {
      if (!isAlreadyExistsError(error)) throw error
    }
    const directoryStat = await lstat(current)
    if (directoryStat.isSymbolicLink() || !directoryStat.isDirectory()) {
      throw new LegacyPreviewImageFilesystemError()
    }
    const realDirectory = await realpath(current)
    if (!isContained(root, realDirectory)) throw new LegacyPreviewImageFilesystemError()
  }
}

async function verifyParentComponents(
  root: string,
  relativePath: string,
  allowMissing: boolean
): Promise<boolean> {
  const segments = validateRelativePath(relativePath).split('/').slice(0, -1)
  let current = root
  for (const segment of segments) {
    current = resolve(current, segment)
    let componentStat
    try {
      componentStat = await lstat(current)
    } catch (error) {
      if (allowMissing && isMissingFileError(error)) return false
      throw error
    }
    if (componentStat.isSymbolicLink() || !componentStat.isDirectory()) {
      throw new LegacyPreviewImageFilesystemError()
    }
    const realComponent = await realpath(current)
    if (!isContained(root, realComponent)) throw new LegacyPreviewImageFilesystemError()
  }
  return true
}

async function verifyRoot(configuredRoot: string): Promise<string> {
  const rootStat = await lstat(configuredRoot)
  if (rootStat.isSymbolicLink() || !rootStat.isDirectory()) {
    throw new LegacyPreviewImageFilesystemError()
  }
  const realRoot = await realpath(configuredRoot)
  if (realRoot !== configuredRoot) throw new LegacyPreviewImageFilesystemError()
  return realRoot
}

function validateConfiguredRoot(value: string): string {
  if (!isAbsolute(value) || value === sep || resolve(value) !== value) {
    throw new LegacyPreviewImageFilesystemError()
  }
  return value
}

function validateRelativePath(value: string): string {
  if (typeof value !== 'string') throw new LegacyPreviewImageFilesystemError()
  const segments = value.split('/')
  if (
    value.length === 0 ||
    value.length > 512 ||
    value.startsWith('/') ||
    value.includes('\\') ||
    value.includes('\0') ||
    segments.some((segment) => !segment || segment === '.' || segment === '..')
  ) {
    throw new LegacyPreviewImageFilesystemError()
  }
  return value
}

function validateMarkerFile(value: string): string {
  const validated = validateRelativePath(value)
  if (validated.includes('/')) throw new LegacyPreviewImageFilesystemError()
  return validated
}

function resolveContained(root: string, relativePath: string): string {
  const absolutePath = resolve(root, validateRelativePath(relativePath))
  if (!isContained(root, absolutePath)) throw new LegacyPreviewImageFilesystemError()
  return absolutePath
}

function isContained(root: string, candidate: string): boolean {
  const fromRoot = relative(root, candidate)
  return (
    fromRoot === '' ||
    (!fromRoot.startsWith(`..${sep}`) && fromRoot !== '..' && !isAbsolute(fromRoot))
  )
}

function parseTargetMarker(contents: string): {
  environment: string
  targetId: string
} {
  let parsed: unknown
  try {
    parsed = JSON.parse(contents)
  } catch {
    throw new LegacyPreviewImageFilesystemError()
  }
  if (
    !isRecord(parsed) ||
    Object.keys(parsed).sort().join(',') !== 'environment,targetId,version' ||
    parsed.version !== 1 ||
    typeof parsed.environment !== 'string' ||
    typeof parsed.targetId !== 'string'
  ) {
    throw new LegacyPreviewImageFilesystemError()
  }
  return { environment: parsed.environment, targetId: parsed.targetId }
}

function safeSize(value: bigint): number {
  return value <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(value) : Number.MAX_SAFE_INTEGER
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isMissingFileError(error: unknown): boolean {
  return isNodeError(error) && error.code === 'ENOENT'
}

function isAlreadyExistsError(error: unknown): boolean {
  return isNodeError(error) && error.code === 'EEXIST'
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && 'code' in error
}

class LegacyPreviewImageFilesystemError extends Error {}
