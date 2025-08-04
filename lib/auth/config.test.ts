import { describe, it, expect, vi, beforeEach } from 'vitest'
import bcrypt from 'bcryptjs'
import { authOptions } from './config'
import { checkRateLimit, recordLoginAttempt } from './rate-limit'

// Mock dependencies
vi.mock('@/lib/db', () => ({
  db: {
    admin: {
      findUnique: vi.fn(),
      update: vi.fn()
    },
    customer: {
      findUnique: vi.fn()
    }
  }
}))

vi.mock('./rate-limit', () => ({
  checkRateLimit: vi.fn(),
  recordLoginAttempt: vi.fn()
}))

vi.mock('bcryptjs', () => ({
  default: {
    compare: vi.fn()
  }
}))

describe('Auth Config', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(checkRateLimit).mockReturnValue({ allowed: true })
  })

  describe('authOptions', () => {
    it('should have correct configuration', () => {
      expect(authOptions.providers).toHaveLength(2)
      expect(authOptions.pages).toEqual({
        signIn: '/login',
        error: '/auth/error'
      })
      expect(authOptions.session).toEqual({
        strategy: 'jwt',
        maxAge: 2 * 60 * 60,
        updateAge: 30 * 60
      })
    })

    it('should have a secret in non-production', () => {
      expect(authOptions.secret).toBe('test-secret-key-for-testing')
    })
  })

  describe('Admin Credentials Provider', () => {
    const adminProvider = authOptions.providers[0] as any
    let authorize: any

    beforeEach(() => {
      authorize = adminProvider.options.authorize
    })

    it('should return null for missing credentials', async () => {
      const result = await authorize({})
      expect(result).toBeNull()

      const result2 = await authorize({ email: 'test@example.com' })
      expect(result2).toBeNull()

      const result3 = await authorize({ password: 'password' })
      expect(result3).toBeNull()
    })

    it('should handle rate limiting', async () => {
      vi.mocked(checkRateLimit).mockReturnValueOnce({ 
        allowed: false, 
        retryAfter: 300 
      })

      await expect(
        authorize({ email: 'admin@example.com', password: 'password' })
      ).rejects.toThrow('Too many login attempts. Please try again in 300 seconds.')
    })

    it('should return null for non-existent admin', async () => {
      const { db } = await import('@/lib/db')
      vi.mocked(db.admin.findUnique).mockResolvedValueOnce(null)

      const result = await authorize({ 
        email: 'notfound@example.com', 
        password: 'password' 
      })

      expect(result).toBeNull()
      expect(recordLoginAttempt).toHaveBeenCalledWith('admin:notfound@example.com', false)
    })

    it('should handle inactive admin', async () => {
      const { db } = await import('@/lib/db')
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      vi.mocked(db.admin.findUnique).mockResolvedValueOnce({
        id: '1',
        email: 'admin@example.com',
        name: 'Admin',
        password: 'hashedpassword',
        role: 'super_admin',
        isActive: false,
        permissions: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLogin: null
      })

      const result = await authorize({ email: 'admin@example.com', password: 'password' })
      
      expect(result).toBeNull()
      expect(recordLoginAttempt).toHaveBeenCalledWith('admin:admin@example.com', false)
      expect(consoleSpy).toHaveBeenCalledWith(
        'Error during admin authentication:', 
        expect.any(Error)
      )
      
      consoleSpy.mockRestore()
    })

    it('should return null for invalid password', async () => {
      const { db } = await import('@/lib/db')
      vi.mocked(db.admin.findUnique).mockResolvedValueOnce({
        id: '1',
        email: 'admin@example.com',
        name: 'Admin',
        password: 'hashedpassword',
        role: 'super_admin',
        isActive: true,
        permissions: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLogin: null
      })
      vi.mocked(bcrypt.compare).mockResolvedValueOnce(false)

      const result = await authorize({ 
        email: 'admin@example.com', 
        password: 'wrongpassword' 
      })

      expect(result).toBeNull()
      expect(recordLoginAttempt).toHaveBeenCalledWith('admin:admin@example.com', false)
    })

    it('should successfully authenticate admin with permissions', async () => {
      const { db } = await import('@/lib/db')
      const mockAdmin = {
        id: '1',
        email: 'admin@example.com',
        name: 'Admin User',
        password: 'hashedpassword',
        role: 'super_admin',
        isActive: true,
        permissions: JSON.stringify(['manage_users', 'manage_settings']),
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLogin: null
      }

      vi.mocked(db.admin.findUnique).mockResolvedValueOnce(mockAdmin)
      vi.mocked(bcrypt.compare).mockResolvedValueOnce(true)
      vi.mocked(db.admin.update).mockResolvedValueOnce({ ...mockAdmin, lastLogin: new Date() })

      const result = await authorize({ 
        email: 'admin@example.com', 
        password: 'correctpassword' 
      })

      expect(result).toEqual({
        id: '1',
        email: 'admin@example.com',
        name: 'Admin User',
        role: 'admin',
        adminRole: 'super_admin',
        permissions: ['manage_users', 'manage_settings']
      })

      expect(db.admin.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { lastLogin: expect.any(Date) }
      })
      expect(recordLoginAttempt).toHaveBeenCalledWith('admin:admin@example.com', true)
    })

    it('should handle invalid permissions JSON gracefully', async () => {
      const { db } = await import('@/lib/db')
      vi.mocked(db.admin.findUnique).mockResolvedValueOnce({
        id: '1',
        email: 'admin@example.com',
        name: 'Admin',
        password: 'hashedpassword',
        role: 'admin',
        isActive: true,
        permissions: 'invalid-json',
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLogin: null
      })
      vi.mocked(bcrypt.compare).mockResolvedValueOnce(true)

      const result = await authorize({ 
        email: 'admin@example.com', 
        password: 'password' 
      })

      expect(result?.permissions).toEqual([])
    })

    it('should handle database errors', async () => {
      const { db } = await import('@/lib/db')
      vi.mocked(db.admin.findUnique).mockRejectedValueOnce(new Error('Database error'))

      const result = await authorize({ 
        email: 'admin@example.com', 
        password: 'password' 
      })

      expect(result).toBeNull()
      expect(recordLoginAttempt).toHaveBeenCalledWith('admin:admin@example.com', false)
    })
  })

  describe('Customer Credentials Provider', () => {
    const customerProvider = authOptions.providers[1] as any
    let authorize: any

    beforeEach(() => {
      authorize = customerProvider.options.authorize
    })

    it('should return null for missing credentials', async () => {
      const result = await authorize({})
      expect(result).toBeNull()
    })

    it('should handle rate limiting', async () => {
      vi.mocked(checkRateLimit).mockReturnValueOnce({ 
        allowed: false, 
        retryAfter: 300 
      })

      await expect(
        authorize({ email: 'customer@example.com', password: 'password' })
      ).rejects.toThrow('Too many login attempts. Please try again in 300 seconds.')
    })

    it('should return null for non-existent customer', async () => {
      const { db } = await import('@/lib/db')
      vi.mocked(db.customer.findUnique).mockResolvedValueOnce(null)

      const result = await authorize({ 
        email: 'notfound@example.com', 
        password: 'password' 
      })

      expect(result).toBeNull()
      expect(recordLoginAttempt).toHaveBeenCalledWith('customer:notfound@example.com', false)
    })

    it('should successfully authenticate customer', async () => {
      const { db } = await import('@/lib/db')
      vi.mocked(db.customer.findUnique).mockResolvedValueOnce({
        id: '2',
        email: 'customer@example.com',
        name: 'Customer Name',
        password: 'hashedpassword',
        phoneNumber: '1234567890',
        birthDate: null,
        address: null,
        loyaltyPoints: 0,
        registrationDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        lastVisit: null,
        notes: null
      })
      vi.mocked(bcrypt.compare).mockResolvedValueOnce(true)

      const result = await authorize({ 
        email: 'customer@example.com', 
        password: 'correctpassword' 
      })

      expect(result).toEqual({
        id: '2',
        email: 'customer@example.com',
        name: 'Customer Name',
        role: 'customer'
      })
      expect(recordLoginAttempt).toHaveBeenCalledWith('customer:customer@example.com', true)
    })

    it('should use default name if customer name is null', async () => {
      const { db } = await import('@/lib/db')
      vi.mocked(db.customer.findUnique).mockResolvedValueOnce({
        id: '3',
        email: 'customer@example.com',
        name: null,
        password: 'hashedpassword',
        phoneNumber: '1234567890',
        birthDate: null,
        address: null,
        loyaltyPoints: 0,
        registrationDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        lastVisit: null,
        notes: null
      })
      vi.mocked(bcrypt.compare).mockResolvedValueOnce(true)

      const result = await authorize({ 
        email: 'customer@example.com', 
        password: 'password' 
      })

      expect(result?.name).toBe('Customer')
    })
  })

  describe('Callbacks', () => {
    it('should handle jwt callback correctly', async () => {
      const token = { id: '', role: 'customer' as const }
      const user = {
        id: '1',
        email: 'admin@example.com',
        name: 'Admin',
        role: 'admin' as const,
        adminRole: 'super_admin',
        permissions: ['manage_users']
      }

      const result = await authOptions.callbacks!.jwt!({ 
        token, 
        user,
        account: null,
        trigger: undefined
      })

      expect(result).toEqual({
        id: '1',
        role: 'admin',
        adminRole: 'super_admin',
        permissions: ['manage_users']
      })
    })

    it('should handle jwt callback without user', async () => {
      const token = { id: '1', role: 'customer' as const }

      const result = await authOptions.callbacks!.jwt!({ 
        token, 
        user: undefined,
        account: null,
        trigger: undefined
      })

      expect(result).toEqual(token)
    })

    it('should handle session callback correctly', async () => {
      const session = {
        user: {
          id: '',
          email: 'test@example.com',
          name: 'Test',
          role: 'customer' as const
        },
        expires: new Date().toISOString()
      }
      const token = {
        id: '1',
        role: 'admin' as const,
        adminRole: 'super_admin',
        permissions: ['manage_users']
      }

      const result = await authOptions.callbacks!.session!({ 
        session, 
        token,
        user: undefined as any
      })

      expect(result.user).toEqual({
        id: '1',
        email: 'test@example.com',
        name: 'Test',
        role: 'admin',
        adminRole: 'super_admin',
        permissions: ['manage_users']
      })
    })
  })
})