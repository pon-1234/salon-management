/**
 * @design_doc   docs/VPS_DEPLOYMENT.md local image delivery contract
 * @related_to   route.ts serves storage images to Next.js image optimization without exposing filesystem internals
 * @known_issues The reverse proxy remains the primary public image server in the VPS deployment
 */
import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  storageRoot: '/tmp/salon-route-test-unset',
}))

vi.mock('@/lib/config/env', () => ({
  env: {
    storage: {
      get root() {
        return mocks.storageRoot
      },
    },
  },
}))

import { GET } from './route'

const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x01])
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x01])
const GIF = Buffer.from('GIF89a\u0001', 'binary')
const WEBP = Buffer.concat([
  Buffer.from('RIFF', 'ascii'),
  Buffer.from([0x08, 0x00, 0x00, 0x00]),
  Buffer.from('WEBPVP8 ', 'ascii'),
])

function requestPath(...path: string[]) {
  return GET(new Request(`http://localhost/salon-uploads/${path.join('/')}`), {
    params: Promise.resolve({ path }),
  })
}

describe('GET /salon-uploads/[...path]', () => {
  let sandboxRoot: string
  let imageRoot: string

  beforeEach(async () => {
    sandboxRoot = await mkdtemp(join(tmpdir(), 'salon-public-image-route-'))
    mocks.storageRoot = sandboxRoot
    imageRoot = join(sandboxRoot, 'images')
    await mkdir(imageRoot)
  })

  afterEach(async () => {
    await rm(sandboxRoot, { recursive: true, force: true })
  })

  it.each([
    ['photo.jpg', JPEG, 'image/jpeg'],
    ['photo.jpeg', JPEG, 'image/jpeg'],
    ['photo.png', PNG, 'image/png'],
    ['photo.gif', GIF, 'image/gif'],
    ['photo.webp', WEBP, 'image/webp'],
  ])('serves a verified %s from STORAGE_ROOT/images', async (filename, contents, mimeType) => {
    const castDirectory = join(imageRoot, 'casts', 'ikebukuro', 'cast-1')
    await mkdir(castDirectory, { recursive: true })
    const sourcePath = join(castDirectory, filename)
    await writeFile(sourcePath, contents)

    const response = await requestPath('casts', 'ikebukuro', 'cast-1', filename)

    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toBe(mimeType)
    expect(response.headers.get('content-length')).toBe(String(contents.byteLength))
    expect(response.headers.get('cache-control')).toBe('public, max-age=31536000, immutable')
    expect(response.headers.get('x-content-type-options')).toBe('nosniff')
    expect(Buffer.from(await response.arrayBuffer())).toEqual(contents)
    await expect(readFile(sourcePath)).resolves.toEqual(contents)
  })

  it.each([
    ['missing file', ['casts', 'missing.jpg']],
    ['empty catch-all', []],
    ['parent traversal', ['casts', '..', 'secret.jpg']],
    ['current-directory traversal', ['casts', '.', 'secret.jpg']],
    ['embedded slash', ['casts/elsewhere', 'secret.jpg']],
    ['embedded backslash', ['casts\\elsewhere', 'secret.jpg']],
    ['hidden target marker', ['.legacy-preview-target.json']],
    ['nested hidden file', ['casts', '.private.jpg']],
    ['NUL byte', ['casts', 'photo\u0000.jpg']],
  ])('returns a non-cacheable 404 for %s', async (_label, path) => {
    const response = await requestPath(...path)

    expect(response.status).toBe(404)
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(response.headers.get('x-content-type-options')).toBe('nosniff')
    await expect(response.text()).resolves.toBe('')
  })

  it('does not follow a symlinked file', async () => {
    const outsideFile = join(sandboxRoot, 'outside.jpg')
    await writeFile(outsideFile, JPEG)
    await symlink(outsideFile, join(imageRoot, 'linked.jpg'))

    const response = await requestPath('linked.jpg')

    expect(response.status).toBe(404)
  })

  it('does not traverse a symlinked directory', async () => {
    const outsideDirectory = join(sandboxRoot, 'outside')
    await mkdir(outsideDirectory)
    await writeFile(join(outsideDirectory, 'photo.jpg'), JPEG)
    await symlink(outsideDirectory, join(imageRoot, 'linked-directory'))

    const response = await requestPath('linked-directory', 'photo.jpg')

    expect(response.status).toBe(404)
  })

  it('rejects a symlinked STORAGE_ROOT', async () => {
    const actualStorageRoot = join(sandboxRoot, 'actual-storage')
    await mkdir(join(actualStorageRoot, 'images'), { recursive: true })
    await writeFile(join(actualStorageRoot, 'images', 'photo.jpg'), JPEG)
    const linkedStorageRoot = join(sandboxRoot, 'linked-storage')
    await symlink(actualStorageRoot, linkedStorageRoot)
    mocks.storageRoot = linkedStorageRoot

    const response = await requestPath('photo.jpg')

    expect(response.status).toBe(404)
  })

  it('rejects directories and other non-file paths', async () => {
    await mkdir(join(imageRoot, 'directory'))

    const response = await requestPath('directory')

    expect(response.status).toBe(404)
  })

  it.each([
    ['unsupported extension', 'photo.svg', Buffer.from('<svg></svg>')],
    ['unsupported contents', 'photo.jpg', Buffer.from('not an image')],
    ['extension and contents mismatch', 'photo.jpg', PNG],
  ])('rejects %s without reflecting the filesystem path', async (_label, filename, contents) => {
    await writeFile(join(imageRoot, filename), contents)

    const response = await requestPath(filename)

    expect(response.status).toBe(404)
    expect(response.headers.get('content-type')).toBeNull()
    await expect(response.text()).resolves.toBe('')
  })
})
