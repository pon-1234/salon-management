/**
 * @design_doc   Middleware authentication tests
 * @related_to   middleware.ts, NextAuth.js
 * @known_issues None currently
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'
import { middleware } from './middleware'

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
        jti: 'test-jwt-id'
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
        jti: 'test-jwt-id-2'
      })

      const request = new NextRequest(new URL('http://localhost:3000/admin/dashboard'))
      
      const response = await middleware(request)
      
      expect(response).toBeInstanceOf(NextResponse)
      expect(response?.status).toBe(403) // Forbidden
    })
  })

  describe('Customer Routes Protection', () => {
    it('should redirect to login when accessing protected customer routes without authentication', async () => {
      const { getToken } = await import('next-auth/jwt')
      vi.mocked(getToken).mockResolvedValueOnce(null)
      
      const request = new NextRequest(new URL('http://localhost:3000/store1/mypage'))
      
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
        jti: 'test-jwt-id-2'
      })

      const request = new NextRequest(new URL('http://localhost:3000/store1/mypage'))
      
      const response = await middleware(request)
      
      expect(response?.status).toBe(200) // NextResponse.next() returns status 200
    })
  })

  describe('Public Routes', () => {
    it('should allow access to public routes without authentication', async () => {
      const { getToken } = await import('next-auth/jwt')
      vi.mocked(getToken).mockResolvedValue(null)
      
      const publicRoutes = [
        '/',
        '/store1',
        '/store1/cast',
        '/store1/services',
        '/store1/pricing',
      ]

      for (const route of publicRoutes) {
        const request = new NextRequest(new URL(`http://localhost:3000${route}`))
        const response = await middleware(request)
        
        expect(response?.status).toBe(200) // NextResponse.next() returns status 200
      }
    })

    it('should allow access to login and register pages without authentication', async () => {
      const { getToken } = await import('next-auth/jwt')
      vi.mocked(getToken).mockResolvedValue(null)
      
      const authRoutes = [
        '/admin/login',
        '/store1/login',
        '/store1/register',
      ]

      for (const route of authRoutes) {
        const request = new NextRequest(new URL(`http://localhost:3000${route}`))
        const response = await middleware(request)
        
        expect(response?.status).toBe(200) // NextResponse.next() returns status 200
      }
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
        jti: 'test-jwt-id'
      })

      const request = new NextRequest(new URL('http://localhost:3000/api/reservation/create'))
      const response = await middleware(request)
      
      expect(response?.status).toBe(200) // NextResponse.next() returns status 200
    })
  })

  describe('Session Management', () => {
    it('should redirect authenticated admin to dashboard from login page', async () => {
      const { getToken } = await import('next-auth/jwt')
      const mockToken = {
        id: '1',
        email: 'admin@example.com',
        role: 'admin' as const,
        sub: '1',
        iat: Date.now() / 1000,
        exp: (Date.now() + 86400000) / 1000,
        jti: 'test-jwt-id'
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
        jti: 'test-jwt-id'
      })

      const request = new NextRequest(new URL('http://localhost:3000/admin'))
      
      const response = await middleware(request)
      
      expect(response).toBeInstanceOf(NextResponse)
      expect(response?.status).toBe(307)
      expect(response?.headers.get('location')).toContain('/admin/dashboard')
    })
  })
})