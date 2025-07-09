/**
 * @design_doc   Tests for Customer login API endpoint with role-based JWT
 * @related_to   Customer model, JWT authentication, middleware.ts
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
    customer: {
      findUnique: vi.fn(),
    },
  },
}))

vi.mock('bcryptjs')
vi.mock('jsonwebtoken')

describe('POST /api/auth/login', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    process.env.JWT_SECRET = 'test-secret'
  })

  it('should return 400 if email or password is missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'customer@example.com' }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Email and password are required')
  })

  it('should return 401 if customer is not found', async () => {
    vi.mocked(db.customer.findUnique).mockResolvedValue(null)

    const request = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'customer@example.com', password: 'password123' }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Invalid credentials')
    expect(db.customer.findUnique).toHaveBeenCalledWith({
      where: { email: 'customer@example.com' },
    })
  })

  it('should return 401 if password is invalid', async () => {
    const mockCustomer = {
      id: 'customer-123',
      email: 'customer@example.com',
      password: 'hashed-password',
      name: 'Test Customer',
      nameKana: 'テスト カスタマー',
      phone: '090-1234-5678',
      birthDate: new Date('1990-01-01'),
      memberType: 'regular',
      points: 100,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    vi.mocked(db.customer.findUnique).mockResolvedValue(mockCustomer)
    vi.mocked(bcrypt.compare).mockResolvedValue(false as never)

    const request = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'customer@example.com', password: 'wrong-password' }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Invalid credentials')
    expect(bcrypt.compare).toHaveBeenCalledWith('wrong-password', 'hashed-password')
  })

  it('should login successfully and return JWT token with correct payload', async () => {
    const mockCustomer = {
      id: 'customer-123',
      email: 'customer@example.com',
      password: 'hashed-password',
      name: 'Test Customer',
      nameKana: 'テスト カスタマー',
      phone: '090-1234-5678',
      birthDate: new Date('1990-01-01'),
      memberType: 'vip',
      points: 500,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    vi.mocked(db.customer.findUnique).mockResolvedValue(mockCustomer)
    vi.mocked(bcrypt.compare).mockResolvedValue(true as never)
    vi.mocked(jwt.sign).mockReturnValue('mock-jwt-token' as any)

    const request = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'customer@example.com', password: 'password123' }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.message).toBe('Login successful')
    expect(data.customer).toEqual({
      id: 'customer-123',
      email: 'customer@example.com',
      name: 'Test Customer',
      memberType: 'vip',
    })

    // Check JWT payload includes role
    expect(jwt.sign).toHaveBeenCalledWith(
      {
        customerId: 'customer-123',
        storeId: expect.any(String),
        role: 'customer',
      },
      'test-secret',
      { expiresIn: '2h' }
    )

    // Check cookie
    const setCookieHeader = response.headers.get('set-cookie')
    expect(setCookieHeader).toContain('auth-token=mock-jwt-token')
    expect(setCookieHeader).toContain('HttpOnly')
    expect(setCookieHeader).toContain('Path=/')
  })

  it('should return 500 if JWT_SECRET is not defined', async () => {
    delete process.env.JWT_SECRET

    const mockCustomer = {
      id: 'customer-123',
      email: 'customer@example.com',
      password: 'hashed-password',
      name: 'Test Customer',
      nameKana: 'テスト カスタマー',
      phone: '090-1234-5678',
      birthDate: new Date('1990-01-01'),
      memberType: 'regular',
      points: 100,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    vi.mocked(db.customer.findUnique).mockResolvedValue(mockCustomer)
    vi.mocked(bcrypt.compare).mockResolvedValue(true as never)

    const request = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'customer@example.com', password: 'password123' }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Internal server error')
  })
})