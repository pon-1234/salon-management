import { describe, it, expect, vi, beforeEach } from 'vitest'
import { SupabaseStorageService } from './supabase-storage'

// Mock Supabase client
const mockSupabaseClient = {
  storage: {
    from: vi.fn().mockReturnThis(),
    upload: vi.fn(),
    remove: vi.fn(),
    getPublicUrl: vi.fn(),
    list: vi.fn()
  }
}

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => mockSupabaseClient)
}))

describe('SupabaseStorageService', () => {
  let service: SupabaseStorageService
  const defaultConfig = {
    bucket: 'test-bucket',
    maxFileSize: 5 * 1024 * 1024,
    allowedTypes: ['image/jpeg', 'image/png']
  }
  
  const originalEnv = process.env

  beforeEach(() => {
    vi.clearAllMocks()
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key'
    }
    mockSupabaseClient.storage.from.mockReturnThis()
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('constructor', () => {
    it('should create instance with valid config and env vars', () => {
      expect(() => new SupabaseStorageService(defaultConfig)).not.toThrow()
    })

    it('should throw error if SUPABASE_URL is missing', () => {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL
      
      expect(() => new SupabaseStorageService(defaultConfig))
        .toThrow('Supabase環境変数が設定されていません')
    })

    it('should throw error if SUPABASE_ANON_KEY is missing', () => {
      delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      
      expect(() => new SupabaseStorageService(defaultConfig))
        .toThrow('Supabase環境変数が設定されていません')
    })
  })

  describe('upload', () => {
    let service: SupabaseStorageService

    beforeEach(() => {
      service = new SupabaseStorageService(defaultConfig)
    })

    it('should upload file successfully', async () => {
      const mockFile = new File(['test content'], 'test.jpg', { type: 'image/jpeg' })
      const mockUploadResult = {
        data: { path: 'uploads/123-abc.jpg' },
        error: null
      }
      const mockPublicUrl = 'https://test.supabase.co/storage/v1/object/public/test-bucket/uploads/123-abc.jpg'
      
      mockSupabaseClient.storage.upload.mockResolvedValueOnce(mockUploadResult)
      mockSupabaseClient.storage.getPublicUrl.mockReturnValueOnce({ 
        data: { publicUrl: mockPublicUrl } 
      })
      
      const result = await service.upload(mockFile)
      
      expect(result).toEqual({
        url: 'uploads/123-abc.jpg',
        filename: 'test.jpg',
        size: mockFile.size,
        publicUrl: mockPublicUrl
      })
      
      expect(mockSupabaseClient.storage.from).toHaveBeenCalledWith('test-bucket')
      expect(mockSupabaseClient.storage.upload).toHaveBeenCalledWith(
        expect.stringMatching(/^uploads\/\d+-\w+\.jpg$/),
        mockFile,
        {
          contentType: 'image/jpeg',
          upsert: false
        }
      )
    })

    it('should throw error if file size exceeds limit', async () => {
      const largeContent = new Array(6 * 1024 * 1024).fill('a').join('')
      const mockFile = new File([largeContent], 'large.jpg', { type: 'image/jpeg' })
      
      await expect(service.upload(mockFile))
        .rejects.toThrow('ファイルサイズが大きすぎます（最大5MB）')
    })

    it('should throw error if file type is not allowed', async () => {
      const mockFile = new File(['test'], 'test.pdf', { type: 'application/pdf' })
      
      await expect(service.upload(mockFile))
        .rejects.toThrow('対応していないファイル形式です')
    })

    it('should use custom options when provided', async () => {
      const mockFile = new File(['test'], 'test.png', { type: 'image/png' })
      const options = {
        folder: 'custom-folder',
        filename: 'custom-name.png',
        contentType: 'image/png',
        upsert: true
      }
      
      mockSupabaseClient.storage.upload.mockResolvedValueOnce({
        data: { path: 'custom-folder/custom-name.png' },
        error: null
      })
      mockSupabaseClient.storage.getPublicUrl.mockReturnValueOnce({ 
        data: { publicUrl: 'https://test.url' } 
      })
      
      await service.upload(mockFile, options)
      
      expect(mockSupabaseClient.storage.upload).toHaveBeenCalledWith(
        'custom-folder/custom-name.png',
        mockFile,
        {
          contentType: 'image/png',
          upsert: true
        }
      )
    })

    it('should handle upload errors', async () => {
      const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
      mockSupabaseClient.storage.upload.mockResolvedValueOnce({
        data: null,
        error: { message: 'Network error' }
      })
      
      await expect(service.upload(mockFile))
        .rejects.toThrow('アップロードに失敗しました: Network error')
    })
  })

  describe('delete', () => {
    let service: SupabaseStorageService

    beforeEach(() => {
      service = new SupabaseStorageService(defaultConfig)
    })

    it('should delete file successfully', async () => {
      mockSupabaseClient.storage.remove.mockResolvedValueOnce({ error: null })
      
      const result = await service.delete('uploads/test.jpg')
      
      expect(result).toEqual({ success: true })
      expect(mockSupabaseClient.storage.remove).toHaveBeenCalledWith(['uploads/test.jpg'])
    })

    it('should handle delete errors', async () => {
      mockSupabaseClient.storage.remove.mockResolvedValueOnce({
        error: { message: 'File not found' }
      })
      
      const result = await service.delete('uploads/nonexistent.jpg')
      
      expect(result).toEqual({
        success: false,
        error: 'File not found'
      })
    })
  })

  describe('getPublicUrl', () => {
    let service: SupabaseStorageService

    beforeEach(() => {
      service = new SupabaseStorageService(defaultConfig)
    })

    it('should return public URL', () => {
      const mockUrl = 'https://test.supabase.co/storage/v1/object/public/test-bucket/uploads/test.jpg'
      mockSupabaseClient.storage.getPublicUrl.mockReturnValueOnce({
        data: { publicUrl: mockUrl }
      })
      
      const result = service.getPublicUrl('uploads/test.jpg')
      
      expect(result).toBe(mockUrl)
      expect(mockSupabaseClient.storage.getPublicUrl).toHaveBeenCalledWith('uploads/test.jpg')
    })
  })

  describe('exists', () => {
    let service: SupabaseStorageService

    beforeEach(() => {
      service = new SupabaseStorageService(defaultConfig)
    })

    it('should return true if file exists', async () => {
      mockSupabaseClient.storage.list.mockResolvedValueOnce({
        data: [{ name: 'test.jpg' }],
        error: null
      })
      
      const result = await service.exists('uploads/test.jpg')
      
      expect(result).toBe(true)
      expect(mockSupabaseClient.storage.list).toHaveBeenCalledWith('uploads', {
        limit: 1,
        search: 'test.jpg'
      })
    })

    it('should return false if file does not exist', async () => {
      mockSupabaseClient.storage.list.mockResolvedValueOnce({
        data: [],
        error: null
      })
      
      const result = await service.exists('uploads/nonexistent.jpg')
      
      expect(result).toBe(false)
    })

    it('should return false on error', async () => {
      mockSupabaseClient.storage.list.mockResolvedValueOnce({
        data: null,
        error: { message: 'Access denied' }
      })
      
      const result = await service.exists('uploads/test.jpg')
      
      expect(result).toBe(false)
    })

    it('should handle root level files', async () => {
      mockSupabaseClient.storage.list.mockResolvedValueOnce({
        data: [{ name: 'root.jpg' }],
        error: null
      })
      
      const result = await service.exists('root.jpg')
      
      expect(result).toBe(true)
      expect(mockSupabaseClient.storage.list).toHaveBeenCalledWith('', {
        limit: 1,
        search: 'root.jpg'
      })
    })
  })
})