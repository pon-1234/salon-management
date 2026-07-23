/**
 * @design_doc   docs/VPS_DEPLOYMENT.md
 * @related_to   LocalStorageService - Persists uploaded files on the VPS volume
 * @known_issues docs/VPS_DEPLOYMENT.md
 */
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { LocalStorageService } from './local-storage'

const PNG_BYTES = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
])

const JPEG_BYTES = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46])

const WEBP_BYTES = new Uint8Array([
  0x52, 0x49, 0x46, 0x46, 0x10, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50, 0x56, 0x50, 0x38, 0x20,
])

const GIF_BYTES = new TextEncoder().encode('GIF89a')

describe('LocalStorageService', () => {
  let storageRoot: string
  let service: LocalStorageService

  beforeEach(async () => {
    storageRoot = await mkdtemp(join(tmpdir(), 'salon-storage-'))
    service = new LocalStorageService(
      {
        bucket: 'images',
        maxFileSize: 1024,
        allowedTypes: ['image/png'],
      },
      {
        root: storageRoot,
        publicBaseUrl: 'https://salon.example.com/salon-uploads',
      }
    )
  })

  afterEach(async () => {
    await rm(storageRoot, { recursive: true, force: true })
  })

  it('uploads a file under the configured root and returns its public URL', async () => {
    const file = new File([PNG_BYTES], 'photo.png', { type: 'image/png' })

    const result = await service.upload(file, { folder: 'casts', filename: 'photo.png' })

    expect(result.url).toBe('casts/photo.png')
    expect(result.publicUrl).toBe('https://salon.example.com/salon-uploads/casts/photo.png')
    await expect(readFile(join(storageRoot, 'images', 'casts', 'photo.png'))).resolves.toEqual(
      Buffer.from(PNG_BYTES)
    )
  })

  it('rejects HTML or SVG content disguised with an allowed image MIME type', async () => {
    const html = new File(['<!doctype html><script>alert(1)</script>'], 'payload.png', {
      type: 'image/png',
    })
    const svg = new File(['<svg xmlns="http://www.w3.org/2000/svg"><script /></svg>'], 'x.png', {
      type: 'image/png',
    })

    await expect(service.upload(html)).rejects.toThrow('対応していないファイル形式です')
    await expect(service.upload(svg)).rejects.toThrow('対応していないファイル形式です')
  })

  it('rejects a declared MIME type that does not match the detected bitmap format', async () => {
    const bitmapService = new LocalStorageService(
      {
        bucket: 'images',
        maxFileSize: 1024,
        allowedTypes: ['image/jpeg', 'image/png'],
      },
      {
        root: storageRoot,
        publicBaseUrl: 'https://salon.example.com/salon-uploads',
      }
    )
    const file = new File([PNG_BYTES], 'photo.jpg', { type: 'image/jpeg' })

    await expect(bitmapService.upload(file)).rejects.toThrow('対応していないファイル形式です')
  })

  it.each([
    ['JPEG', JPEG_BYTES, 'image/jpeg', 'jpg'],
    ['PNG', PNG_BYTES, 'image/png', 'png'],
    ['WebP', WEBP_BYTES, 'image/webp', 'webp'],
    ['GIF', GIF_BYTES, 'image/gif', 'gif'],
  ])(
    'stores detected %s content with its canonical extension',
    async (_, bytes, mime, extension) => {
      const bitmapService = new LocalStorageService(
        {
          bucket: 'images',
          maxFileSize: 1024,
          allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
        },
        {
          root: storageRoot,
          publicBaseUrl: 'https://salon.example.com/salon-uploads',
        }
      )
      const file = new File([bytes], 'payload.html', { type: mime })

      const result = await bitmapService.upload(file, { folder: 'casts' })

      expect(result.url).toMatch(new RegExp(`^casts/\\d+-[0-9a-f-]+\\.${extension}$`, 'u'))
      await expect(readFile(join(storageRoot, 'images', result.url))).resolves.toEqual(
        Buffer.from(bytes)
      )
    }
  )

  it('rejects path traversal in folders and filenames', async () => {
    const file = new File([PNG_BYTES], 'photo.png', { type: 'image/png' })

    await expect(service.upload(file, { folder: '../private' })).rejects.toThrow(
      '不正なファイルパスです'
    )
    await expect(service.upload(file, { filename: '../../secret' })).rejects.toThrow(
      '不正なファイルパスです'
    )
  })

  it('deletes files and reports whether a path exists', async () => {
    const file = new File([PNG_BYTES], 'photo.png', { type: 'image/png' })
    await service.upload(file, { folder: 'chat', filename: 'photo.png' })

    await expect(service.exists('chat/photo.png')).resolves.toBe(true)
    await expect(service.delete('chat/photo.png')).resolves.toEqual({ success: true })
    await expect(service.exists('chat/photo.png')).resolves.toBe(false)
  })
})
