/**
 * @design_doc   Middleware authentication tests
 * @related_to   middleware.ts, NextAuth.js
 * @known_issues None currently
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'
import { config, middleware } from './middleware'

// Mock NextAuth JWT
vi.mock('next-auth/jwt', () => ({
  getToken: vi.fn(),
}))

describe('Middleware Authentication', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Admin Routes Protection', () => {
    it('should redirect to /admin/login when accessing admin routes without authentication', async () => {
      const { getToken } = await import('next-auth/jwt')
      vi.mocked(getToken).mockResolvedValueOnce(null)

      const request = new NextRequest(new URL('http://localhost:3000/admin/dashboard'))

      const response = await middleware(request)

      expect(response).toBeInstanceOf(NextResponse)
      expect(response?.status).toBe(307) // Temporary redirect
      expect(response?.headers.get('location')).toContain('/admin/login')
    })

    it('should allow access to admin routes with valid admin session', async () => {
      const { getToken } = await import('next-auth/jwt')
      vi.mocked(getToken).mockResolvedValueOnce({
        id: '1',
        email: 'admin@example.com',
        role: 'admin',
        sub: '1',
        iat: Date.now() / 1000,
        exp: (Date.now() + 86400000) / 1000,
        jti: 'test-jwt-id',
      })

      const request = new NextRequest(new URL('http://localhost:3000/admin/dashboard'))

      const response = await middleware(request)

      expect(response?.status).toBe(200) // NextResponse.next() returns status 200
    })

    it('should deny access to admin routes for non-admin users', async () => {
      const { getToken } = await import('next-auth/jwt')
      vi.mocked(getToken).mockResolvedValueOnce({
        id: '2',
        email: 'customer@example.com',
        role: 'customer',
        sub: '2',
        iat: Date.now() / 1000,
        exp: (Date.now() + 86400000) / 1000,
        jti: 'test-jwt-id-2',
      })

      const request = new NextRequest(new URL('http://localhost:3000/admin/dashboard'))

      const response = await middleware(request)

      expect(response).toBeInstanceOf(NextResponse)
      expect(response?.status).toBe(307)
      expect(response?.headers.get('location')).toContain('/admin/login')
    })
  })

  describe('Customer Routes Protection', () => {
    it('should redirect to login when accessing protected customer routes without authentication', async () => {
      const { getToken } = await import('next-auth/jwt')
      vi.mocked(getToken).mockResolvedValueOnce(null)

      const request = new NextRequest(new URL('http://localhost:3000/store1/mypage'), {
        headers: { cookie: 'salon_age_verified=1' },
      })

      const response = await middleware(request)

      expect(response).toBeInstanceOf(NextResponse)
      expect(response?.status).toBe(307)
      expect(response?.headers.get('location')).toContain('/store1/login')
    })

    it('should allow access to protected customer routes with valid session', async () => {
      const { getToken } = await import('next-auth/jwt')
      vi.mocked(getToken).mockResolvedValueOnce({
        id: '2',
        email: 'customer@example.com',
        role: 'customer',
        sub: '2',
        iat: Date.now() / 1000,
        exp: (Date.now() + 86400000) / 1000,
        jti: 'test-jwt-id-2',
      })

      const request = new NextRequest(new URL('http://localhost:3000/store1/mypage'), {
        headers: { cookie: 'salon_age_verified=1' },
      })

      const response = await middleware(request)

      expect(response?.status).toBe(200) // NextResponse.next() returns status 200
    })
  })

  describe('Public Routes', () => {
    it('allows the public request-attendance submission without authentication', async () => {
      const { getToken } = await import('next-auth/jwt')
      vi.mocked(getToken).mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/request-attendance', {
        method: 'POST',
      })
      const response = await middleware(request)

      expect(response?.status).toBe(200)
      expect(getToken).not.toHaveBeenCalled()
    })

    it('exposes only public availability and schedule reads without authentication', async () => {
      const { getToken } = await import('next-auth/jwt')
      vi.mocked(getToken).mockResolvedValue(null)

      const publicRequests = [
        new NextRequest(
          'http://localhost:3000/api/reservation/availability?storeId=store-a&castId=cast-a&date=2026-08-15&duration=60'
        ),
        new NextRequest('http://localhost:3000/api/store-schedule?storeId=store-a&days=1'),
      ]

      for (const request of publicRequests) {
        const response = await middleware(request)
        expect(response?.status).toBe(200)
        expect(response?.headers.get('x-middleware-next')).toBe('1')
      }
      expect(getToken).not.toHaveBeenCalled()
    })

    it('exposes only the exact review GET endpoint without authentication', async () => {
      const { getToken } = await import('next-auth/jwt')
      vi.mocked(getToken).mockResolvedValue(null)

      const publicResponse = await middleware(
        new NextRequest('http://localhost:3000/api/review?storeId=store-a')
      )
      const childResponse = await middleware(
        new NextRequest('http://localhost:3000/api/review/eligible?storeId=store-a')
      )

      expect(publicResponse?.status).toBe(200)
      expect(publicResponse?.headers.get('x-middleware-next')).toBe('1')
      expect(childResponse?.status).toBe(401)
      expect(getToken).toHaveBeenCalledTimes(1)
    })

    it('keeps exact reservation conflict details behind authentication', async () => {
      const { getToken } = await import('next-auth/jwt')
      vi.mocked(getToken).mockResolvedValueOnce(null)

      const response = await middleware(
        new NextRequest(
          'http://localhost:3000/api/reservation/availability?mode=check&storeId=store-a&castId=cast-a'
        )
      )

      expect(response?.status).toBe(401)
    })

    it('does not make future store schedule child APIs public by prefix', async () => {
      const { getToken } = await import('next-auth/jwt')
      vi.mocked(getToken).mockResolvedValueOnce(null)

      const response = await middleware(
        new NextRequest('http://localhost:3000/api/store-schedule/internal?storeId=store-a')
      )

      expect(response?.status).toBe(401)
    })

    it('allows the container health check without authentication', async () => {
      const { getToken } = await import('next-auth/jwt')
      vi.mocked(getToken).mockResolvedValue(null)

      const request = new NextRequest(new URL('http://localhost:3000/api/health'))
      const response = await middleware(request)

      expect(response?.status).toBe(200)
    })

    it('should allow access to public routes without authentication', async () => {
      const { getToken } = await import('next-auth/jwt')
      vi.mocked(getToken).mockResolvedValue(null)

      const publicRoutes = ['/', '/store1', '/store1/cast', '/store1/services', '/store1/pricing']

      for (const route of publicRoutes) {
        const request = new NextRequest(new URL(`http://localhost:3000${route}`), {
          headers: { cookie: 'salon_age_verified=1' },
        })
        const response = await middleware(request)

        expect(response?.status).toBe(200) // NextResponse.next() returns status 200
      }

      expect(getToken).not.toHaveBeenCalled()
    })

    it('should allow access to login and register pages without authentication', async () => {
      const { getToken } = await import('next-auth/jwt')
      vi.mocked(getToken).mockResolvedValue(null)

      const authRoutes = ['/admin/login', '/store1/login', '/store1/register']

      for (const route of authRoutes) {
        const request = new NextRequest(new URL(`http://localhost:3000${route}`), {
          headers: { cookie: 'salon_age_verified=1' },
        })
        const response = await middleware(request)

        expect(response?.status).toBe(200) // NextResponse.next() returns status 200
      }
    })

    it('allows cast login pages without authentication', async () => {
      const { getToken } = await import('next-auth/jwt')
      vi.mocked(getToken).mockResolvedValue(null)

      const authRoutes = ['/cast/login', '/ikebukuro/cast/login']

      for (const route of authRoutes) {
        const request = new NextRequest(new URL(`http://localhost:3000${route}`))
        const response = await middleware(request)

        expect(response?.status).toBe(200)
        expect(response?.headers.get('x-middleware-next')).toBe('1')
      }
    })
  })

  describe('Middleware Scope', () => {
    it('does not run against immutable Next.js assets', () => {
      expect(config.matcher).toContain(
        '/((?!_next/static|_next/image|salon-uploads/|favicon.ico|robots.txt|images/|videos/).*)'
      )
    })

    it('does not treat a route as public merely because it shares a string prefix', async () => {
      const { getToken } = await import('next-auth/jwt')

      const request = new NextRequest(new URL('http://localhost:3000/administer'), {
        headers: { cookie: 'salon_age_verified=1' },
      })
      const response = await middleware(request)

      expect(response?.status).toBe(200)
      expect(getToken).not.toHaveBeenCalled()
    })
  })

  describe('API Routes Protection', () => {
    it('should protect reservation API endpoints', async () => {
      const { getToken } = await import('next-auth/jwt')
      vi.mocked(getToken).mockResolvedValueOnce(null)

      const request = new NextRequest(new URL('http://localhost:3000/api/reservation/create'))
      const response = await middleware(request)

      expect(response?.status).toBe(401)
      const data = await response?.json()
      expect(data.error).toBe('Authentication required')
    })

    it('should protect cast API endpoints', async () => {
      const { getToken } = await import('next-auth/jwt')
      vi.mocked(getToken).mockResolvedValueOnce(null)

      const request = new NextRequest(new URL('http://localhost:3000/api/cast/update'))
      const response = await middleware(request)

      expect(response?.status).toBe(401)
      const data = await response?.json()
      expect(data.error).toBe('Authentication required')
    })

    it('should allow authenticated users to access protected API routes', async () => {
      const { getToken } = await import('next-auth/jwt')
      vi.mocked(getToken).mockResolvedValueOnce({
        id: '1',
        email: 'user@example.com',
        role: 'customer',
        sub: '1',
        iat: Date.now() / 1000,
        exp: (Date.now() + 86400000) / 1000,
        jti: 'test-jwt-id',
      })

      const request = new NextRequest(new URL('http://localhost:3000/api/reservation/create'))
      const response = await middleware(request)

      expect(response?.status).toBe(200) // NextResponse.next() returns status 200
    })

    it('allows an admin to access an assigned store-scoped API', async () => {
      const { getToken } = await import('next-auth/jwt')
      vi.mocked(getToken).mockResolvedValueOnce({
        id: 'manager-1',
        role: 'admin',
        adminRole: 'manager',
        permissions: ['reservation:*'],
        storeIds: ['ginza'],
      } as any)
      const request = new NextRequest(
        new URL('http://localhost:3000/api/reservation?storeId=ginza')
      )

      const response = await middleware(request)

      expect(response?.status).toBe(200)
    })

    it('allows an admin to access an assigned store-scoped API by store slug', async () => {
      const { getToken } = await import('next-auth/jwt')
      vi.mocked(getToken).mockResolvedValueOnce({
        id: 'manager-1',
        role: 'admin',
        adminRole: 'manager',
        permissions: ['reservation:*'],
        storeIds: ['uat-ikebukuro'],
        storeSlugs: ['ikebukuro'],
      } as any)
      const request = new NextRequest(
        new URL('http://localhost:3000/api/reservation?storeId=ikebukuro')
      )

      const response = await middleware(request)

      expect(response?.status).toBe(200)
    })

    it('denies an admin access to an unassigned store-scoped API', async () => {
      const { getToken } = await import('next-auth/jwt')
      vi.mocked(getToken).mockResolvedValueOnce({
        id: 'manager-1',
        role: 'admin',
        adminRole: 'manager',
        permissions: ['reservation:*'],
        storeIds: ['ginza'],
      } as any)
      const request = new NextRequest(
        new URL('http://localhost:3000/api/reservation?storeId=shinjuku')
      )

      const response = await middleware(request)

      expect(response?.status).toBe(403)
      await expect(response?.json()).resolves.toEqual({
        error: 'この店舗を操作する権限がありません',
      })
    })

    it('requires explicit store context for an admin store-scoped API', async () => {
      const { getToken } = await import('next-auth/jwt')
      vi.mocked(getToken).mockResolvedValueOnce({
        id: 'super-1',
        role: 'admin',
        adminRole: 'super_admin',
        permissions: ['*'],
        storeIds: [],
      } as any)
      const request = new NextRequest(new URL('http://localhost:3000/api/reservation'))

      const response = await middleware(request)

      expect(response?.status).toBe(400)
      await expect(response?.json()).resolves.toEqual({
        error: '店舗を明示してください',
      })
    })

    it('allows a super administrator to access any explicit store', async () => {
      const { getToken } = await import('next-auth/jwt')
      vi.mocked(getToken).mockResolvedValueOnce({
        id: 'super-1',
        role: 'admin',
        adminRole: 'super_admin',
        permissions: ['*'],
        storeIds: [],
      } as any)
      const request = new NextRequest(
        new URL('http://localhost:3000/api/reservation?storeId=shinjuku')
      )

      const response = await middleware(request)

      expect(response?.status).toBe(200)
    })
  })

  describe('Session Management', () => {
    it('allows a customer session to open cast login pages and switch roles', async () => {
      const { getToken } = await import('next-auth/jwt')
      const customerToken = {
        id: 'customer-1',
        email: 'customer@example.com',
        role: 'customer',
        sub: 'customer-1',
        iat: Date.now() / 1000,
        exp: (Date.now() + 86400000) / 1000,
        jti: 'customer-session',
      } as const
      vi.mocked(getToken).mockResolvedValueOnce(customerToken).mockResolvedValueOnce(customerToken)

      const castLoginRoutes = ['/cast/login', '/ikebukuro/cast/login']

      for (const route of castLoginRoutes) {
        const request = new NextRequest(new URL(`http://localhost:3000${route}`), {
          headers: { cookie: 'salon_age_verified=1' },
        })
        const response = await middleware(request)

        expect(response?.status).toBe(200)
        expect(response?.headers.get('x-middleware-next')).toBe('1')
        expect(response?.headers.get('location')).toBeNull()
      }
    })

    it('should redirect authenticated admin to dashboard from login page', async () => {
      const { getToken } = await import('next-auth/jwt')
      const mockToken = {
        id: '1',
        email: 'admin@example.com',
        role: 'admin' as const,
        sub: '1',
        iat: Date.now() / 1000,
        exp: (Date.now() + 86400000) / 1000,
        jti: 'test-jwt-id',
      }
      vi.mocked(getToken).mockResolvedValueOnce(mockToken)

      const request = new NextRequest(new URL('http://localhost:3000/admin/login'))

      const response = await middleware(request)

      expect(response).toBeInstanceOf(NextResponse)
      expect(response?.status).toBe(307)
      expect(response?.headers.get('location')).toContain('/admin/dashboard')
    })

    it('should redirect /admin to /admin/dashboard for authenticated admin', async () => {
      const { getToken } = await import('next-auth/jwt')
      vi.mocked(getToken).mockResolvedValueOnce({
        id: '1',
        email: 'admin@example.com',
        role: 'admin',
        sub: '1',
        iat: Date.now() / 1000,
        exp: (Date.now() + 86400000) / 1000,
        jti: 'test-jwt-id',
      })

      const request = new NextRequest(new URL('http://localhost:3000/admin'))

      const response = await middleware(request)

      expect(response).toBeInstanceOf(NextResponse)
      expect(response?.status).toBe(307)
      expect(response?.headers.get('location')).toContain('/admin/dashboard')
    })
  })
})
