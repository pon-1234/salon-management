import { describe, it, expect, vi, beforeEach } from 'vitest'

// We need to clear modules to reset the singleton
vi.mock('./supabase-storage')

describe('Storage Index', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    
    vi.doMock('./supabase-storage', () => ({
      SupabaseStorageService: vi.fn().mockImplementation((config) => ({
        config,
        upload: vi.fn(),
        delete: vi.fn(),
        getPublicUrl: vi.fn(),
        exists: vi.fn()
      }))
    }))
  })

  describe('getStorageService', () => {
    it('should create a new instance with default config', async () => {
      const { getStorageService } = await import('./index')
      const { SupabaseStorageService } = await import('./supabase-storage')
      
      const service = getStorageService()
      
      expect(SupabaseStorageService).toHaveBeenCalledWith({
        bucket: 'images',
        maxFileSize: 5 * 1024 * 1024,
        allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
      })
      expect(service).toBeDefined()
    })

    it('should merge custom config with defaults', async () => {
      const { getStorageService } = await import('./index')
      const { SupabaseStorageService } = await import('./supabase-storage')
      
      const customConfig = {
        bucket: 'custom-bucket',
        maxFileSize: 10 * 1024 * 1024
      }
      
      const service = getStorageService(customConfig)
      
      expect(SupabaseStorageService).toHaveBeenCalledWith({
        bucket: 'custom-bucket',
        maxFileSize: 10 * 1024 * 1024,
        allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
      })
    })

    it('should return the same instance on subsequent calls', async () => {
      const { getStorageService } = await import('./index')
      const { SupabaseStorageService } = await import('./supabase-storage')
      
      const service1 = getStorageService()
      const service2 = getStorageService({ bucket: 'different-bucket' })
      
      expect(service1).toBe(service2)
      expect(SupabaseStorageService).toHaveBeenCalledTimes(1)
    })

    it('should allow overriding all config options', async () => {
      const { getStorageService } = await import('./index')
      const { SupabaseStorageService } = await import('./supabase-storage')
      
      const customConfig = {
        bucket: 'documents',
        maxFileSize: 20 * 1024 * 1024,
        allowedTypes: ['application/pdf', 'application/msword']
      }
      
      getStorageService(customConfig)
      
      expect(SupabaseStorageService).toHaveBeenCalledWith(customConfig)
    })

    it('should handle empty config', async () => {
      const { getStorageService } = await import('./index')
      const { SupabaseStorageService } = await import('./supabase-storage')
      
      const service = getStorageService({})
      
      expect(SupabaseStorageService).toHaveBeenCalledWith({
        bucket: 'images',
        maxFileSize: 5 * 1024 * 1024,
        allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
      })
      expect(service).toBeDefined()
    })
  })
})