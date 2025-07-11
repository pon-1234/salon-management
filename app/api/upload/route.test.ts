import { NextRequest } from 'next/server'
import { POST } from './route'
import { put } from '@vercel/blob'
import { vi } from 'vitest'

vi.mock('@vercel/blob', () => ({
  put: vi.fn(),
}))

vi.mock('@/lib/logger', () => ({
  default: {
    error: vi.fn(),
  },
}))

describe('POST /api/upload', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // 環境変数のモック
    process.env.BLOB_READ_WRITE_TOKEN = 'test-token'
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

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('対応していないファイル形式です（JPEG, PNG, WebPのみ）')
  })

  it('正常にファイルをアップロードできる', async () => {
    const mockBlobUrl = 'https://example.vercel-storage.com/test-image.jpg'
    vi.mocked(put).mockResolvedValue({
      url: mockBlobUrl,
      downloadUrl: mockBlobUrl,
      pathname: 'test-image.jpg',
      contentType: 'image/jpeg',
      contentDisposition: 'inline',
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
    expect(data.url).toBe(mockBlobUrl)
    expect(data.filename).toBe('test.jpg')

    expect(put).toHaveBeenCalledWith(
      expect.stringContaining('test.jpg'),
      file,
      expect.objectContaining({
        access: 'public',
        addRandomSuffix: true,
      })
    )
  })

  it('アップロードエラーの場合は500エラーを返す', async () => {
    vi.mocked(put).mockRejectedValue(new Error('Upload failed'))

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