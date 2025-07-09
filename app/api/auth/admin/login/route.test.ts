/**
 * @design_doc   Tests for Admin login API endpoint
 * @related_to   Admin model in Prisma schema, JWT authentication
 * @known_issues None currently
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from './route'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

// Mock dependencies
vi.mock('@/lib/db', () => ({
  db: {
    admin: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}))

vi.mock('bcrypt')
vi.mock('jsonwebtoken')

describe('POST /api/auth/admin/login', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    process.env.JWT_SECRET = 'test-secret'
  })

  it('should return 400 if email or password is missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth/admin/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'admin@example.com' }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Email and password are required')
  })

  it('should return 401 if admin is not found', async () => {
    vi.mocked(db.admin.findUnique).mockResolvedValue(null)

    const request = new NextRequest('http://localhost:3000/api/auth/admin/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'admin@example.com', password: 'password123' }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Invalid credentials')
    expect(db.admin.findUnique).toHaveBeenCalledWith({
      where: { email: 'admin@example.com' },
    })
  })

  it('should return 401 if password is invalid', async () => {
    const mockAdmin = {
      id: 'admin-123',
      email: 'admin@example.com',
      password: 'hashed-password',
      name: 'Admin User',
      role: 'staff',
      permissions: null,
      isActive: true,
      lastLogin: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    vi.mocked(db.admin.findUnique).mockResolvedValue(mockAdmin)
    vi.mocked(bcrypt.compare).mockResolvedValue(false as never)

    const request = new NextRequest('http://localhost:3000/api/auth/admin/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'admin@example.com', password: 'wrong-password' }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Invalid credentials')
    expect(bcrypt.compare).toHaveBeenCalledWith('wrong-password', 'hashed-password')
  })

  it('should return 403 if admin account is not active', async () => {
    const mockAdmin = {
      id: 'admin-123',
      email: 'admin@example.com',
      password: 'hashed-password',
      name: 'Admin User',
      role: 'staff',
      permissions: null,
      isActive: false,
      lastLogin: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    vi.mocked(db.admin.findUnique).mockResolvedValue(mockAdmin)
    vi.mocked(bcrypt.compare).mockResolvedValue(true as never)

    const request = new NextRequest('http://localhost:3000/api/auth/admin/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'admin@example.com', password: 'password123' }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.error).toBe('Account is not active')
  })

  it('should login successfully and return JWT token with correct payload', async () => {
    const mockAdmin = {
      id: 'admin-123',
      email: 'admin@example.com',
      password: 'hashed-password',
      name: 'Admin User',
      role: 'manager',
      permissions: JSON.stringify(['cast:read', 'cast:write']),
      isActive: true,
      lastLogin: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    vi.mocked(db.admin.findUnique).mockResolvedValue(mockAdmin)
    vi.mocked(db.admin.update).mockResolvedValue({ ...mockAdmin, lastLogin: new Date() })
    vi.mocked(bcrypt.compare).mockResolvedValue(true as never)
    vi.mocked(jwt.sign).mockReturnValue('mock-jwt-token' as any)

    const request = new NextRequest('http://localhost:3000/api/auth/admin/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'admin@example.com', password: 'password123' }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.message).toBe('Login successful')
    expect(data.admin).toEqual({
      id: 'admin-123',
      email: 'admin@example.com',
      name: 'Admin User',
      role: 'manager',
    })

    // Check JWT payload
    expect(jwt.sign).toHaveBeenCalledWith(
      {
        adminId: 'admin-123',
        role: 'admin',
        permissions: ['cast:read', 'cast:write'],
      },
      'test-secret',
      { expiresIn: '8h' }
    )

    // Check lastLogin update
    expect(db.admin.update).toHaveBeenCalledWith({
      where: { id: 'admin-123' },
      data: { lastLogin: expect.any(Date) },
    })

    // Check cookie
    const setCookieHeader = response.headers.get('set-cookie')
    expect(setCookieHeader).toContain('auth-token=mock-jwt-token')
    expect(setCookieHeader).toContain('HttpOnly')
    expect(setCookieHeader).toContain('Path=/')
  })

  it('should return 500 if JWT_SECRET is not defined', async () => {
    delete process.env.JWT_SECRET

    const mockAdmin = {
      id: 'admin-123',
      email: 'admin@example.com',
      password: 'hashed-password',
      name: 'Admin User',
      role: 'staff',
      permissions: null,
      isActive: true,
      lastLogin: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    vi.mocked(db.admin.findUnique).mockResolvedValue(mockAdmin)
    vi.mocked(bcrypt.compare).mockResolvedValue(true as never)

    const request = new NextRequest('http://localhost:3000/api/auth/admin/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'admin@example.com', password: 'password123' }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Internal server error')
  })
})