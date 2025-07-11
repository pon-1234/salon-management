import { NextRequest } from 'next/server'
import { POST } from './route'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import type { StorageService } from '@/lib/storage'

const mockStorageService: StorageService = {
  upload: vi.fn(),
  delete: vi.fn(),
  getPublicUrl: vi.fn(),
  exists: vi.fn(),
}

vi.mock('@/lib/storage', () => ({
  getStorageService: () => mockStorageService,
}))

vi.mock('@/lib/logger', () => ({
  default: {
    error: vi.fn(),
  },
}))

describe('POST /api/upload', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('ファイルが選択されていない場合はエラーを返す', async () => {
    const formData = new FormData()
    const request = {
      formData: vi.fn().mockResolvedValue(formData),
    } as unknown as NextRequest

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('ファイルが選択されていません')
  })

  it('ファイルサイズが5MBを超える場合はエラーを返す', async () => {
    const largeFile = new File(['x'.repeat(6 * 1024 * 1024)], 'large.jpg', { type: 'image/jpeg' })
    const formData = new FormData()
    formData.append('file', largeFile)

    const request = {
      formData: vi.fn().mockResolvedValue(formData),
    } as unknown as NextRequest

    // ストレージサービスがサイズエラーを投げるようにモック
    vi.mocked(mockStorageService.upload).mockRejectedValue(
      new Error('ファイルサイズが大きすぎます（最大5MB）')
    )

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('ファイルサイズが大きすぎます（最大5MB）')
  })

  it('対応していないファイル形式の場合はエラーを返す', async () => {
    const file = new File(['test'], 'test.txt', { type: 'text/plain' })
    const formData = new FormData()
    formData.append('file', file)

    const request = {
      formData: vi.fn().mockResolvedValue(formData),
    } as unknown as NextRequest

    // ストレージサービスがファイル形式エラーを投げるようにモック
    vi.mocked(mockStorageService.upload).mockRejectedValue(
      new Error('対応していないファイル形式です')
    )

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('対応していないファイル形式です（JPEG, PNG, WebPのみ）')
  })

  it('正常にファイルをアップロードできる', async () => {
    const mockPublicUrl =
      'https://example.supabase.co/storage/v1/object/public/images/test-image.jpg'
    const mockPath = 'uploads/test-image.jpg'

    vi.mocked(mockStorageService.upload).mockResolvedValue({
      url: mockPath,
      filename: 'test.jpg',
      size: 1000,
      publicUrl: mockPublicUrl,
    })

    const file = new File(['test image content'], 'test.jpg', { type: 'image/jpeg' })
    const formData = new FormData()
    formData.append('file', file)

    const request = {
      formData: vi.fn().mockResolvedValue(formData),
    } as unknown as NextRequest

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.url).toBe(mockPublicUrl)
    expect(data.filename).toBe('test.jpg')
    expect(data.path).toBe(mockPath)

    expect(mockStorageService.upload).toHaveBeenCalledWith(
      file,
      expect.objectContaining({
        folder: 'uploads',
      })
    )
  })

  it('アップロードエラーの場合は500エラーを返す', async () => {
    vi.mocked(mockStorageService.upload).mockRejectedValue(new Error('Upload failed'))

    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
    const formData = new FormData()
    formData.append('file', file)

    const request = {
      formData: vi.fn().mockResolvedValue(formData),
    } as unknown as NextRequest

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('アップロードに失敗しました')
  })
})
