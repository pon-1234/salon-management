/**
 * @design_doc   Credentials authentication security and session propagation tests
 * @related_to   config.ts, rate-limit.ts, and password-policy.ts
 * @known_issues External identity providers are not configured
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import bcrypt from 'bcryptjs'
import { authOptions } from './config'
import { checkRateLimit, recordLoginAttempt } from './rate-limit'
import logger from '@/lib/logger'

// Mock dependencies
vi.mock('@/lib/db', () => ({
  db: {
    admin: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    customer: {
      findUnique: vi.fn(),
    },
  },
}))

vi.mock('./rate-limit', () => ({
  checkRateLimit: vi.fn(),
  recordLoginAttempt: vi.fn(),
}))

vi.mock('bcryptjs', () => ({
  default: {
    compare: vi.fn(),
  },
}))

describe('Auth Config', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(checkRateLimit).mockReturnValue({ allowed: true })
  })

  describe('authOptions', () => {
    it('should have correct configuration', () => {
      expect(authOptions.providers).toHaveLength(3)
      expect(authOptions.pages).toEqual({
        signIn: '/login',
        error: '/auth/error',
      })
      expect(authOptions.session).toEqual({
        strategy: 'jwt',
        maxAge: 2 * 60 * 60,
        updateAge: 30 * 60,
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
        retryAfter: 300,
      })

      await expect(authorize({ email: 'admin@example.com', password: 'password' })).rejects.toThrow(
        'Too many login attempts. Please try again in 300 seconds.'
      )
    })

    it('should return null for non-existent admin', async () => {
      const { db } = await import('@/lib/db')
      vi.mocked(db.admin.findUnique).mockResolvedValueOnce(null)

      const result = await authorize({
        email: 'notfound@example.com',
        password: 'password',
      })

      expect(result).toBeNull()
      expect(recordLoginAttempt).toHaveBeenCalledWith('admin:notfound@example.com', false)
    })

    it('normalizes admin email before rate limiting and lookup', async () => {
      const { db } = await import('@/lib/db')
      vi.mocked(db.admin.findUnique).mockResolvedValueOnce(null)

      const result = await authorize({
        email: '  Admin@Example.COM  ',
        password: 'password',
      })

      expect(result).toBeNull()
      expect(checkRateLimit).toHaveBeenCalledWith('admin:admin@example.com')
      expect(db.admin.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { email: 'admin@example.com' } })
      )
      expect(recordLoginAttempt).toHaveBeenCalledWith('admin:admin@example.com', false)
    })

    it('should handle inactive admin', async () => {
      const { db } = await import('@/lib/db')

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

        lastLogin: null,
      })

      const result = await authorize({ email: 'admin@example.com', password: 'password' })

      expect(result).toBeNull()
      expect(recordLoginAttempt).toHaveBeenCalledWith('admin:admin@example.com', false)
      expect(recordLoginAttempt).toHaveBeenCalledTimes(1)
      expect(logger.error).toHaveBeenCalledWith(
        'Error during admin authentication:',
        expect.any(Error)
      )
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

        lastLogin: null,
      })
      vi.mocked(bcrypt.compare).mockResolvedValueOnce(false as never)

      const result = await authorize({
        email: 'admin@example.com',
        password: 'wrongpassword',
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
        storeAssignments: [],
        createdAt: new Date(),
        updatedAt: new Date(),

        lastLogin: null,
      }

      vi.mocked(db.admin.findUnique).mockResolvedValueOnce(mockAdmin)
      vi.mocked(bcrypt.compare).mockResolvedValueOnce(true as never)
      vi.mocked(db.admin.update).mockResolvedValueOnce({ ...mockAdmin, lastLogin: new Date() })

      const result = await authorize({
        email: 'admin@example.com',
        password: 'correctpassword',
      })

      expect(result).toEqual({
        id: '1',
        email: 'admin@example.com',
        name: 'Admin User',
        role: 'admin',
        adminRole: 'super_admin',
        permissions: ['manage_users', 'manage_settings'],
        storeIds: [],
      })

      expect(db.admin.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { lastLogin: expect.any(Date) },
      })
      expect(recordLoginAttempt).toHaveBeenCalledWith('admin:admin@example.com', true)
    })

    it('includes assigned store IDs for a non-super administrator', async () => {
      const { db } = await import('@/lib/db')
      const mockAdmin = {
        id: 'manager-1',
        email: 'manager@example.com',
        name: 'Manager',
        password: 'hashedpassword',
        role: 'manager',
        isActive: true,
        permissions: JSON.stringify(['reservation:*']),
        storeAssignments: [{ storeId: 'ginza' }, { storeId: 'shinjuku' }],
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLogin: null,
      }

      vi.mocked(db.admin.findUnique).mockResolvedValueOnce(mockAdmin as any)
      vi.mocked(bcrypt.compare).mockResolvedValueOnce(true as never)
      vi.mocked(db.admin.update).mockResolvedValueOnce({
        ...mockAdmin,
        lastLogin: new Date(),
      } as any)

      const result = await authorize({ email: 'manager@example.com', password: 'password' })

      expect(result).toEqual(
        expect.objectContaining({
          adminRole: 'manager',
          storeIds: ['ginza', 'shinjuku'],
        })
      )
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

        lastLogin: null,
      })
      vi.mocked(bcrypt.compare).mockResolvedValueOnce(true as never)

      const result = await authorize({
        email: 'admin@example.com',
        password: 'password',
      })

      expect(result?.permissions).toEqual([])
    })

    it('should handle database errors', async () => {
      const { db } = await import('@/lib/db')
      vi.mocked(db.admin.findUnique).mockRejectedValueOnce(new Error('Database error'))

      const result = await authorize({
        email: 'admin@example.com',
        password: 'password',
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
        retryAfter: 300,
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
        password: 'password',
      })

      expect(result).toBeNull()
      expect(recordLoginAttempt).toHaveBeenCalledWith('customer:notfound@example.com', false)
    })

    it('normalizes customer email before rate limiting', async () => {
      const { db } = await import('@/lib/db')
      vi.mocked(db.customer.findUnique).mockResolvedValueOnce(null)

      const result = await authorize({
        email: '  Customer@Example.COM  ',
        password: 'password',
      })

      expect(result).toBeNull()
      expect(checkRateLimit).toHaveBeenCalledWith('customer:customer@example.com')
      expect(db.customer.findUnique).toHaveBeenCalledWith({
        where: { email: 'customer@example.com' },
      })
      expect(recordLoginAttempt).toHaveBeenCalledWith('customer:customer@example.com', false)
    })

    it('should not authenticate the removed demo customer fallback', async () => {
      const { db } = await import('@/lib/db')
      vi.mocked(db.customer.findUnique).mockResolvedValueOnce(null)

      const result = await authorize({
        email: 'tanaka@example.com',
        password: 'password123',
      })

      expect(result).toBeNull()
      expect(recordLoginAttempt).toHaveBeenCalledWith('customer:tanaka@example.com', false)
    })

    it('should successfully authenticate customer', async () => {
      const { db } = await import('@/lib/db')
      vi.mocked(db.customer.findUnique).mockResolvedValueOnce({
        id: '2',
        email: 'customer@example.com',
        name: 'Customer Name',
        password: 'hashedpassword',
        phone: '1234567890',
        birthDate: new Date(),

        nameKana: 'カスタマーネーム',

        memberType: 'regular',
        accountStatus: 'active',
        membershipStage: 'regular',
        lastLoginAt: null,
        lastVisitAt: null,

        points: 0,
        smsEnabled: true,
        emailNotificationEnabled: true,

        createdAt: new Date(),
        updatedAt: new Date(),
        resetToken: null,
        resetTokenExpiry: null,
        emailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpiry: null,
        phoneVerified: false,
        phoneVerifiedAt: null,
        phoneVerificationCode: null,
        phoneVerificationExpiry: null,
        phoneVerificationAttempts: 0,
      })
      vi.mocked(bcrypt.compare).mockResolvedValueOnce(true as never)

      const result = await authorize({
        email: 'customer@example.com',
        password: 'correctpassword',
      })

      expect(result).toEqual({
        id: '2',
        email: 'customer@example.com',
        name: 'Customer Name',
        role: 'customer',
      })
      expect(recordLoginAttempt).toHaveBeenCalledWith('customer:customer@example.com', true)
    })

    it('does not authenticate a blocked legacy customer even with valid credentials', async () => {
      const { db } = await import('@/lib/db')
      vi.mocked(db.customer.findUnique).mockResolvedValueOnce({
        id: 'blocked',
        email: 'blocked@example.com',
        name: 'Blocked Customer',
        password: 'hashedpassword',
        phone: '09012345678',
        birthDate: new Date(),
        nameKana: 'ブロック',
        memberType: 'regular',
        accountStatus: 'blocked',
        membershipStage: 'regular',
        lastLoginAt: null,
        lastVisitAt: null,
        points: 0,
        smsEnabled: false,
        emailNotificationEnabled: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        resetToken: null,
        resetTokenExpiry: null,
        emailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpiry: null,
        phoneVerified: false,
        phoneVerifiedAt: null,
        phoneVerificationCode: null,
        phoneVerificationExpiry: null,
        phoneVerificationAttempts: 0,
      })
      vi.mocked(bcrypt.compare).mockResolvedValueOnce(true as never)

      const result = await authorize({
        email: 'blocked@example.com',
        password: 'correctpassword',
      })

      expect(result).toBeNull()
      expect(recordLoginAttempt).toHaveBeenCalledWith('customer:blocked@example.com', false)
    })

    it('should use default name if customer name is null', async () => {
      const { db } = await import('@/lib/db')
      vi.mocked(db.customer.findUnique).mockResolvedValueOnce({
        id: '3',
        email: 'customer@example.com',
        name: '',
        password: 'hashedpassword',
        phone: '1234567890',
        birthDate: new Date(),

        nameKana: 'カスタマーネーム',

        memberType: 'regular',
        accountStatus: 'active',
        membershipStage: 'regular',
        lastLoginAt: null,
        lastVisitAt: null,

        points: 0,
        smsEnabled: true,
        emailNotificationEnabled: true,

        createdAt: new Date(),
        updatedAt: new Date(),
        resetToken: null,
        resetTokenExpiry: null,
        emailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpiry: null,
        phoneVerified: false,
        phoneVerifiedAt: null,
        phoneVerificationCode: null,
        phoneVerificationExpiry: null,
        phoneVerificationAttempts: 0,
      })
      vi.mocked(bcrypt.compare).mockResolvedValueOnce(true as never)

      const result = await authorize({
        email: 'customer@example.com',
        password: 'password',
      })

      expect(result?.name).toBe('Customer')
    })

    it('rejects an unverified customer even when the password is correct', async () => {
      const { db } = await import('@/lib/db')
      vi.mocked(db.customer.findUnique).mockResolvedValueOnce({
        id: 'unverified-1',
        email: 'customer@example.com',
        name: 'Customer',
        password: 'hashedpassword',
        emailVerified: false,
      } as never)
      vi.mocked(bcrypt.compare).mockResolvedValueOnce(true as never)

      const result = await authorize({
        email: 'customer@example.com',
        password: 'correctpassword',
      })

      expect(result).toBeNull()
      expect(recordLoginAttempt).toHaveBeenCalledWith('customer:customer@example.com', false)
    })

    it.each(['a'.repeat(73), 'あ'.repeat(25), 'password\n123'])(
      'rejects a password bcrypt cannot represent exactly: %j',
      async (password) => {
        const { db } = await import('@/lib/db')

        const result = await authorize({ email: 'customer@example.com', password })

        expect(result).toBeNull()
        expect(db.customer.findUnique).not.toHaveBeenCalled()
        expect(bcrypt.compare).not.toHaveBeenCalled()
      }
    )
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
        permissions: ['manage_users'],
        storeIds: ['ginza'],
      }

      const result = await authOptions.callbacks!.jwt!({
        token,
        user,
        account: null,
        trigger: undefined,
      })

      expect(result).toEqual({
        id: '1',
        role: 'admin',
        adminRole: 'super_admin',
        permissions: ['manage_users'],
        storeIds: ['ginza'],
      })
    })

    it('should handle jwt callback without user', async () => {
      const token = { id: '1', role: 'customer' as const }

      const result = await authOptions.callbacks!.jwt!({
        token,
        user: undefined as any,
        account: null,
        trigger: undefined,
      })

      expect(result).toEqual(token)
    })

    it('should handle session callback correctly', async () => {
      const session = {
        user: {
          id: '',
          email: 'test@example.com',
          name: 'Test',
          role: 'customer' as const,
        },
        expires: new Date().toISOString(),
      }
      const token = {
        id: '1',
        role: 'admin' as const,
        adminRole: 'super_admin',
        permissions: ['manage_users'],
        storeIds: ['ginza'],
      }

      const result = await authOptions.callbacks!.session!({
        session,
        token,
        user: undefined as any,
        newSession: undefined,
        trigger: undefined,
      } as any)

      expect(result.user).toEqual({
        id: '1',
        email: 'test@example.com',
        name: 'Test',
        role: 'admin',
        adminRole: 'super_admin',
        permissions: ['manage_users'],
        storeIds: ['ginza'],
      })
    })
  })
})
