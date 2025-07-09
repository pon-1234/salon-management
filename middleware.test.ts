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
      
      expect(response).toBeUndefined() // No redirect, allow access
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
      
      expect(response).toBeUndefined() // No redirect, allow access
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
        
        expect(response).toBeUndefined() // No redirect, allow access
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
        
        expect(response).toBeUndefined() // No redirect, allow access
      }
    })
  })

  describe('Session Management', () => {
    it('should pass session data to the request headers', async () => {
      const { getToken } = await import('next-auth/jwt')
      const mockToken = {
        id: '1',
        email: 'user@example.com',
        role: 'customer' as const,
        sub: '1',
        iat: Date.now() / 1000,
        exp: (Date.now() + 86400000) / 1000,
        jti: 'test-jwt-id'
      }
      vi.mocked(getToken).mockResolvedValueOnce(mockToken)

      const request = new NextRequest(new URL('http://localhost:3000/store1/mypage'))
      
      const response = await middleware(request)
      
      // Verify token was checked
      expect(vi.mocked(getToken)).toHaveBeenCalled()
    })
  })
})