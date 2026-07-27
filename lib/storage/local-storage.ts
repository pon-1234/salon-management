/**
 * @design_doc   docs/VPS_DEPLOYMENT.md
 * @related_to   StorageService - Defines the application storage contract; getStorageService - Creates the production storage adapter
 * @known_issues docs/VPS_DEPLOYMENT.md
 */
import { mkdir, rm, stat, writeFile } from 'node:fs/promises'
import { basename, join, relative, resolve, sep } from 'node:path'
import type {
  DeleteResult,
  StorageConfig,
  StorageService,
  UploadOptions,
  UploadResult,
} from './types'

interface LocalStorageOptions {
  root: string
  publicBaseUrl: string
}

interface DetectedBitmapFormat {
  mimeType: 'image/gif' | 'image/jpeg' | 'image/png' | 'image/webp'
  extension: 'gif' | 'jpg' | 'png' | 'webp'
}

const UNSUPPORTED_FILE_TYPE_MESSAGE = '対応していないファイル形式です'

function startsWithBytes(contents: Buffer, signature: readonly number[]): boolean {
  return (
    contents.length >= signature.length &&
    signature.every((byte, index) => contents[index] === byte)
  )
}

function detectBitmapFormat(contents: Buffer): DetectedBitmapFormat | null {
  if (startsWithBytes(contents, [0xff, 0xd8, 0xff])) {
    return { mimeType: 'image/jpeg', extension: 'jpg' }
  }

  if (startsWithBytes(contents, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return { mimeType: 'image/png', extension: 'png' }
  }

  if (
    contents.length >= 16 &&
    contents.toString('ascii', 0, 4) === 'RIFF' &&
    contents.toString('ascii', 8, 12) === 'WEBP' &&
    ['VP8 ', 'VP8L', 'VP8X'].includes(contents.toString('ascii', 12, 16))
  ) {
    return { mimeType: 'image/webp', extension: 'webp' }
  }

  const gifSignature = contents.toString('ascii', 0, 6)
  if (gifSignature === 'GIF87a' || gifSignature === 'GIF89a') {
    return { mimeType: 'image/gif', extension: 'gif' }
  }

  return null
}

function normalizeMimeType(mimeType: string): string {
  const normalized = mimeType.trim().toLowerCase()
  return normalized === 'image/jpg' ? 'image/jpeg' : normalized
}

function replaceExtension(filename: string, extension: DetectedBitmapFormat['extension']): string {
  const lastDot = filename.lastIndexOf('.')
  const stem = lastDot > 0 ? filename.slice(0, lastDot) : filename
  return `${stem || 'upload'}.${extension}`
}

function assertSafeRelativePath(path: string): string {
  const normalized = path.replaceAll('\\', '/').replace(/^\/+|\/+$/g, '')
  const segments = normalized.split('/')
  if (!normalized || segments.some((segment) => !segment || segment === '.' || segment === '..')) {
    throw new Error('不正なファイルパスです')
  }
  return normalized
}

function ensureContained(root: string, relativePath: string): string {
  const absoluteRoot = resolve(root)
  const absolutePath = resolve(absoluteRoot, relativePath)
  const pathFromRoot = relative(absoluteRoot, absolutePath)
  if (pathFromRoot.startsWith(`..${sep}`) || pathFromRoot === '..') {
    throw new Error('不正なファイルパスです')
  }
  return absolutePath
}

async function readFileContents(file: File): Promise<Buffer> {
  if (typeof file.arrayBuffer === 'function') {
    return Buffer.from(await file.arrayBuffer())
  }
  return new Promise<Buffer>((resolvePromise, rejectPromise) => {
    const reader = new FileReader()
    reader.onerror = () =>
      rejectPromise(reader.error ?? new Error('ファイルの読み込みに失敗しました'))
    reader.onload = () => resolvePromise(Buffer.from(reader.result as ArrayBuffer))
    reader.readAsArrayBuffer(file)
  })
}

export class LocalStorageService implements StorageService {
  private readonly bucketRoot: string
  private readonly publicBaseUrl: string

  constructor(
    private readonly config: StorageConfig,
    options: LocalStorageOptions
  ) {
    this.bucketRoot = join(options.root, assertSafeRelativePath(config.bucket))
    this.publicBaseUrl = options.publicBaseUrl.replace(/\/+$/u, '')
  }

  async upload(file: File, options?: UploadOptions): Promise<UploadResult> {
    if (file.size > this.config.maxFileSize) {
      throw new Error(
        `ファイルサイズが大きすぎます（最大${this.config.maxFileSize / 1024 / 1024}MB）`
      )
    }
    const claimedMimeType = normalizeMimeType(file.type)
    const allowedTypes = new Set(this.config.allowedTypes.map(normalizeMimeType))
    if (!allowedTypes.has(claimedMimeType)) {
      throw new Error(UNSUPPORTED_FILE_TYPE_MESSAGE)
    }

    const folder = assertSafeRelativePath(options?.folder ?? 'uploads')
    const requestedFilename = options?.filename
      ? assertSafeRelativePath(options.filename)
      : `${Date.now()}-${crypto.randomUUID()}`
    if (requestedFilename.includes('/')) {
      throw new Error('不正なファイルパスです')
    }

    const contents = await readFileContents(file)
    if (contents.byteLength > this.config.maxFileSize) {
      throw new Error(
        `ファイルサイズが大きすぎます（最大${this.config.maxFileSize / 1024 / 1024}MB）`
      )
    }
    const detectedFormat = detectBitmapFormat(contents)
    if (
      !detectedFormat ||
      detectedFormat.mimeType !== claimedMimeType ||
      !allowedTypes.has(detectedFormat.mimeType)
    ) {
      throw new Error(UNSUPPORTED_FILE_TYPE_MESSAGE)
    }

    const filename = replaceExtension(basename(requestedFilename), detectedFormat.extension)
    const storagePath = `${folder}/${filename}`
    const absolutePath = ensureContained(this.bucketRoot, storagePath)

    await mkdir(resolve(absolutePath, '..'), { recursive: true })
    await writeFile(absolutePath, contents, { flag: options?.upsert ? 'w' : 'wx' })

    return {
      url: storagePath,
      filename: file.name,
      size: file.size,
      publicUrl: this.getPublicUrl(storagePath),
    }
  }

  async delete(path: string): Promise<DeleteResult> {
    try {
      await rm(ensureContained(this.bucketRoot, assertSafeRelativePath(path)))
      return { success: true }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'ファイルの削除に失敗しました'
      return { success: false, error: message }
    }
  }

  getPublicUrl(path: string): string {
    const safePath = assertSafeRelativePath(path)
    return `${this.publicBaseUrl}/${safePath.split('/').map(encodeURIComponent).join('/')}`
  }

  async exists(path: string): Promise<boolean> {
    try {
      await stat(ensureContained(this.bucketRoot, assertSafeRelativePath(path)))
      return true
    } catch {
      return false
    }
  }
}
