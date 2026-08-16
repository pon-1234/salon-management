/**
 * @design_doc   docs/VPS_DEPLOYMENT.md local image delivery contract
 * @related_to   LocalStorageService writes supported images below STORAGE_ROOT/images; Next.js image optimization reads them through this route
 * @known_issues The reverse proxy remains the primary public image server in the VPS deployment
 */
import { constants } from 'node:fs'
import { lstat, open } from 'node:fs/promises'
import { extname, isAbsolute, join, parse, resolve } from 'node:path'
import { env } from '@/lib/config/env'
import { detectBitmapFormat, type DetectedBitmapFormat } from '@/lib/storage/bitmap-format'

interface RouteContext {
  params: Promise<{ path: string[] }>
}

type SupportedImageMime = DetectedBitmapFormat['mimeType']

interface VerifiedImage {
  contents: Buffer
  mimeType: SupportedImageMime
}

const IMMUTABLE_IMAGE_CACHE = 'public, max-age=31536000, immutable'
const NOT_FOUND_HEADERS = {
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
}
const MIME_BY_EXTENSION: Readonly<Record<string, SupportedImageMime>> = {
  '.gif': 'image/gif',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
}
const EXPECTED_FILESYSTEM_REJECTIONS = new Set([
  'EACCES',
  'EISDIR',
  'ELOOP',
  'ENOENT',
  'ENOTDIR',
  'EPERM',
])

function notFound(): Response {
  return new Response(null, { status: 404, headers: NOT_FOUND_HEADERS })
}

function isExpectedFilesystemRejection(error: unknown): boolean {
  return (
    error instanceof Error &&
    'code' in error &&
    typeof error.code === 'string' &&
    EXPECTED_FILESYSTEM_REJECTIONS.has(error.code)
  )
}

function isSafePathSegment(segment: string): boolean {
  return (
    segment.length > 0 &&
    segment !== '.' &&
    segment !== '..' &&
    !segment.startsWith('.') &&
    !segment.includes('/') &&
    !segment.includes('\\') &&
    !segment.includes('\u0000')
  )
}

async function readVerifiedImage(
  storageRoot: string,
  pathSegments: readonly string[]
): Promise<VerifiedImage | null> {
  if (
    pathSegments.length === 0 ||
    !pathSegments.every(isSafePathSegment) ||
    !isAbsolute(storageRoot) ||
    resolve(storageRoot) === parse(resolve(storageRoot)).root
  ) {
    return null
  }

  const expectedMime = MIME_BY_EXTENSION[extname(pathSegments.at(-1)!).toLowerCase()]
  if (!expectedMime) {
    return null
  }

  try {
    const storageRootStat = await lstat(storageRoot)
    if (storageRootStat.isSymbolicLink() || !storageRootStat.isDirectory()) {
      return null
    }

    let currentPath = join(storageRoot, 'images')
    const imageRootStat = await lstat(currentPath)
    if (imageRootStat.isSymbolicLink() || !imageRootStat.isDirectory()) {
      return null
    }

    for (const [index, segment] of pathSegments.entries()) {
      currentPath = join(currentPath, segment)
      const pathStat = await lstat(currentPath)
      const isFinalSegment = index === pathSegments.length - 1
      if (
        pathStat.isSymbolicLink() ||
        (isFinalSegment ? !pathStat.isFile() : !pathStat.isDirectory())
      ) {
        return null
      }
    }

    const expectedFileStat = await lstat(currentPath)
    const fileHandle = await open(currentPath, constants.O_RDONLY | constants.O_NOFOLLOW)
    try {
      const openedFileStat = await fileHandle.stat()
      if (
        !openedFileStat.isFile() ||
        openedFileStat.dev !== expectedFileStat.dev ||
        openedFileStat.ino !== expectedFileStat.ino
      ) {
        return null
      }

      const contents = await fileHandle.readFile()
      const detectedMime = detectBitmapFormat(contents)?.mimeType ?? null
      if (detectedMime !== expectedMime) {
        return null
      }
      return { contents, mimeType: detectedMime }
    } finally {
      await fileHandle.close()
    }
  } catch (error) {
    if (isExpectedFilesystemRejection(error)) {
      return null
    }
    throw error
  }
}

export async function GET(_request: Request, context: RouteContext): Promise<Response> {
  const { path } = await context.params
  const image = await readVerifiedImage(env.storage.root, path)
  if (!image) {
    return notFound()
  }

  const body = new Uint8Array(image.contents.byteLength)
  body.set(image.contents)
  return new Response(body, {
    headers: {
      'Cache-Control': IMMUTABLE_IMAGE_CACHE,
      'Content-Length': String(image.contents.byteLength),
      'Content-Type': image.mimeType,
      'X-Content-Type-Options': 'nosniff',
    },
  })
}

export const runtime = 'nodejs'
