/**
 * @design_doc   Tests for role-based access control middleware
 * @related_to   middleware.ts, JWT authentication, Admin and Customer models
 * @known_issues None currently
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'
import { middleware } from './middleware'
import { jwtVerify } from 'jose'

// Mock jose library
vi.mock('jose', () => ({
  jwtVerify: vi.fn(),
}))

describe('middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.JWT_SECRET = 'test-secret'
  })

  describe('Public routes', () => {
    it('should allow access to public routes without authentication', async () => {
      const request = new NextRequest('http://localhost:3000/')
      const response = await middleware(request)
      
      expect(response?.status).toBe(200)
    })

    it('should allow access to login pages without authentication', async () => {
      const loginRoutes = ['/login', '/register', '/admin/login']
      
      for (const route of loginRoutes) {
        const request = new NextRequest(`http://localhost:3000${route}`)
        const response = await middleware(request)
        
        expect(response?.status).toBe(200)
      }
    })
  })

  describe('Admin routes', () => {
    it('should redirect to admin login if no token is present', async () => {
      const request = new NextRequest('http://localhost:3000/admin/dashboard')
      const response = await middleware(request)
      
      expect(response?.status).toBe(307)
      expect(response?.headers.get('location')).toBe('http://localhost:3000/admin/login')
    })

    it('should return 401 JSON for API routes without authentication', async () => {
      const request = new NextRequest('http://localhost:3000/api/reservation/create')
      const response = await middleware(request)
      
      expect(response?.status).toBe(401)
      const data = await response?.json()
      expect(data.error).toBe('Authentication required')
    })

    it('should allow access for valid admin token', async () => {
      const mockPayload = {
        adminId: 'admin-123',
        role: 'admin',
        permissions: ['cast:read', 'cast:write'],
      }
      
      vi.mocked(jwtVerify).mockResolvedValue({
        payload: mockPayload,
        protectedHeader: { alg: 'HS256' },
      })

      const request = new NextRequest('http://localhost:3000/admin/dashboard')
      request.cookies.set('auth-token', 'valid-admin-token')
      
      const response = await middleware(request)
      
      expect(response?.status).toBe(200)
      expect(response?.headers.get('x-customer-id')).toBe('admin-123')
    })

    it('should deny access for customer token on admin routes', async () => {
      const mockPayload = {
        customerId: 'customer-123',
        role: 'customer',
      }
      
      vi.mocked(jwtVerify).mockResolvedValue({
        payload: mockPayload,
        protectedHeader: { alg: 'HS256' },
      })

      const request = new NextRequest('http://localhost:3000/admin/dashboard')
      request.cookies.set('auth-token', 'valid-customer-token')
      
      const response = await middleware(request)
      
      expect(response?.status).toBe(403)
      const data = await response?.json()
      expect(data.error).toBe('Access denied. Admin role required.')
    })

    it('should handle invalid JWT token', async () => {
      vi.mocked(jwtVerify).mockRejectedValue(new Error('Invalid token'))

      const request = new NextRequest('http://localhost:3000/admin/dashboard')
      request.cookies.set('auth-token', 'invalid-token')
      
      const response = await middleware(request)
      
      expect(response?.status).toBe(307)
      expect(response?.headers.get('location')).toBe('http://localhost:3000/admin/login')
    })

    it('should return JSON error for invalid token on API routes', async () => {
      vi.mocked(jwtVerify).mockRejectedValue(new Error('Invalid token'))

      const request = new NextRequest('http://localhost:3000/api/admin/users')
      request.cookies.set('auth-token', 'invalid-token')
      
      const response = await middleware(request)
      
      expect(response?.status).toBe(401)
      const data = await response?.json()
      expect(data.error).toBe('Invalid or expired token')
    })
  })

  describe('Customer routes', () => {
    it('should redirect to store-specific login for mypage without authentication', async () => {
      const request = new NextRequest('http://localhost:3000/store1/mypage')
      const response = await middleware(request)
      
      expect(response?.status).toBe(307)
      expect(response?.headers.get('location')).toBe('http://localhost:3000/store1/login')
    })

    it('should allow access to mypage with valid customer token', async () => {
      const mockPayload = {
        customerId: 'customer-123',
        storeId: 'store1',
        role: 'customer',
      }
      
      vi.mocked(jwtVerify).mockResolvedValue({
        payload: mockPayload,
        protectedHeader: { alg: 'HS256' },
      })

      const request = new NextRequest('http://localhost:3000/store1/mypage')
      request.cookies.set('auth-token', 'valid-customer-token')
      
      const response = await middleware(request)
      
      expect(response?.status).toBe(200)
      expect(response?.headers.get('x-customer-id')).toBe('customer-123')
    })
  })

  describe('Role-based redirects', () => {
    it('should redirect /admin to /admin/dashboard for authenticated admin', async () => {
      const mockPayload = {
        adminId: 'admin-123',
        role: 'admin',
        permissions: [],
      }
      
      vi.mocked(jwtVerify).mockResolvedValue({
        payload: mockPayload,
        protectedHeader: { alg: 'HS256' },
      })

      const request = new NextRequest('http://localhost:3000/admin')
      request.cookies.set('auth-token', 'valid-admin-token')
      
      const response = await middleware(request)
      
      expect(response?.status).toBe(307)
      expect(response?.headers.get('location')).toBe('http://localhost:3000/admin/dashboard')
    })
  })

  describe('JWT payload validation', () => {
    it('should validate admin JWT has required fields', async () => {
      const mockPayload = {
        adminId: 'admin-123',
        // Missing role field
      }
      
      vi.mocked(jwtVerify).mockResolvedValue({
        payload: mockPayload,
        protectedHeader: { alg: 'HS256' },
      })

      const request = new NextRequest('http://localhost:3000/admin/dashboard')
      request.cookies.set('auth-token', 'invalid-admin-token')
      
      const response = await middleware(request)
      
      expect(response?.status).toBe(307)
      expect(response?.headers.get('location')).toBe('http://localhost:3000/admin/login')
    })

    it('should validate customer JWT has required fields', async () => {
      const mockPayload = {
        // Missing customerId field
        role: 'customer',
      }
      
      vi.mocked(jwtVerify).mockResolvedValue({
        payload: mockPayload,
        protectedHeader: { alg: 'HS256' },
      })

      const request = new NextRequest('http://localhost:3000/store1/mypage')
      request.cookies.set('auth-token', 'invalid-customer-token')
      
      const response = await middleware(request)
      
      expect(response?.status).toBe(307)
      expect(response?.headers.get('location')).toBe('http://localhost:3000/store1/login')
    })

    it('should return JSON error for invalid token structure on API routes', async () => {
      const mockPayload = {
        role: 'admin',
        // Missing adminId
      }
      
      vi.mocked(jwtVerify).mockResolvedValue({
        payload: mockPayload,
        protectedHeader: { alg: 'HS256' },
      })

      const request = new NextRequest('http://localhost:3000/api/admin/users')
      request.cookies.set('auth-token', 'invalid-structure-token')
      
      const response = await middleware(request)
      
      expect(response?.status).toBe(401)
      const data = await response?.json()
      expect(data.error).toBe('Invalid token structure')
    })
  })

  describe('Protected API paths', () => {
    it('should protect reservation API endpoints', async () => {
      const request = new NextRequest('http://localhost:3000/api/reservation/create')
      const response = await middleware(request)
      
      expect(response?.status).toBe(401)
      const data = await response?.json()
      expect(data.error).toBe('Authentication required')
    })

    it('should protect cast API endpoints', async () => {
      const request = new NextRequest('http://localhost:3000/api/cast/update')
      const response = await middleware(request)
      
      expect(response?.status).toBe(401)
      const data = await response?.json()
      expect(data.error).toBe('Authentication required')
    })
  })
})