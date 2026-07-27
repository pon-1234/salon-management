/**
 * @design_doc   Tests for Customer API endpoints
 * @related_to   customer/route.ts, CustomerRepository, Customer type
 * @known_issues None currently
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { GET, POST, PUT, DELETE } from './route'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'

vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}))

vi.mock('@/lib/auth/config', () => ({
  authOptions: {},
}))

// Mock the database
vi.mock('@/lib/db', () => ({
  db: {
    customer: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}))

// Mock bcryptjs
vi.mock('bcryptjs', () => ({
  default: {
    hash: vi.fn(),
    compare: vi.fn(),
  },
}))

// Mock logger
vi.mock('@/lib/logger', () => ({
  default: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
}))

// Mock getServerSession
vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}))

// Mock auth config
vi.mock('@/lib/auth/config', () => ({
  authOptions: {},
}))

describe('GET /api/customer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getServerSession).mockResolvedValue(null as any)
  })

  it('should require authentication to get customer by ID', async () => {
    const request = new NextRequest('http://localhost:3000/api/customer?id=customer1', {
      method: 'GET',
    })

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Authentication required')
  })

  it('should prevent access to other customer data', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { id: 'customer1', role: 'customer' },
    } as any)

    const request = new NextRequest('http://localhost:3000/api/customer?id=other-customer', {
      method: 'GET',
    })

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.error).toBe('Forbidden')
  })

  it('should return customer data for authenticated customer', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { id: 'customer1', role: 'customer' },
    } as any)

    const mockCustomer = {
      id: 'customer1',
      name: 'Test Customer',
      nameKana: 'テストカスタマー',
      phone: '09012345678',
      email: 'test@example.com',
      password: 'hashed-password',
      resetToken: 'reset-secret',
      emailVerificationToken: 'email-secret',
      phoneVerificationCode: '123456',
      birthDate: new Date('1990-01-01'),
      memberType: 'regular',
      points: 100,
      ngCasts: [
        {
          castId: 'cast-1',
          notes: 'staff-only note',
          cast: {
            id: 'cast-1',
            name: '公開キャスト名',
            loginEmail: 'cast@example.com',
            lineUserId: 'line-secret',
            welfareExpenseRate: 10,
          },
        },
      ],
      reservations: [
        {
          id: 'reservation-1',
          customerId: 'customer1',
          storeRevenue: 12_000,
          staffRevenue: 18_000,
          course: { id: 'course-1', name: '90分', storeShare: 12_000, castShare: 18_000 },
          cast: {
            id: 'cast-1',
            name: '公開キャスト名',
            loginEmail: 'cast@example.com',
          },
        },
      ],
      reviews: [
        {
          id: 'review-1',
          rating: 5,
          comment: 'よかったです',
          cast: {
            id: 'cast-1',
            name: '公開キャスト名',
            lineUserId: 'line-secret',
          },
        },
      ],
    }

    vi.mocked(db.customer.findUnique).mockResolvedValueOnce(mockCustomer as any)

    const request = new NextRequest('http://localhost:3000/api/customer?id=customer1', {
      method: 'GET',
    })

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.id).toBe('customer1')
    expect(data.password).toBeUndefined() // Password should not be returned
    expect(data.resetToken).toBeUndefined()
    expect(data.emailVerificationToken).toBeUndefined()
    expect(data.phoneVerificationCode).toBeUndefined()
    expect(data.ngCasts[0].cast).toEqual({ id: 'cast-1', name: '公開キャスト名' })
    expect(JSON.stringify(data)).not.toMatch(
      /staff-only note|cast@example\.com|line-secret|welfareExpenseRate|storeRevenue|staffRevenue|storeShare|castShare/
    )
  })

  it('should return 404 for non-existent customer', async () => {
    vi.mocked(db.customer.findUnique).mockResolvedValueOnce(null)

    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { id: 'customer1', role: 'customer' },
    } as any)

    const request = new NextRequest('http://localhost:3000/api/customer?id=customer1', {
      method: 'GET',
    })

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Customer not found')
  })

  it('should require admin role when no id parameter provided', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { id: 'customer1', role: 'customer' },
    } as any)

    const request = new NextRequest('http://localhost:3000/api/customer', {
      method: 'GET',
    })

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.error).toBe('Forbidden')
  })

  it('should allow admin to search customers by phone', async () => {
    const mockCustomer = {
      id: 'cust1',
      name: '検索対象',
      phone: '09012345678',
      email: 'search@example.com',
      birthDate: new Date('1990-01-01'),
      memberType: 'regular',
      points: 200,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-02'),
    }

    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { id: 'admin', role: 'admin', permissions: ['customer:read'] },
    } as any)

    vi.mocked(db.customer.findMany).mockResolvedValueOnce([mockCustomer] as any)

    const request = new NextRequest('http://localhost:3000/api/customer?phone=090', {
      method: 'GET',
    })

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(Array.isArray(data)).toBe(true)
    expect(data).toHaveLength(1)
    expect(data[0].id).toBe(mockCustomer.id)
    expect(data[0].password).toBeUndefined()
  })

  it('rejects an admin without customer:read permission before loading customer data', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { id: 'admin', role: 'admin', permissions: [] },
    } as any)

    const response = await GET(
      new NextRequest('http://localhost:3000/api/customer?id=customer1', { method: 'GET' })
    )

    expect(response.status).toBe(403)
    expect(db.customer.findUnique).not.toHaveBeenCalled()
    expect(db.customer.findMany).not.toHaveBeenCalled()
  })
})

describe('POST /api/customer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: 'admin1', role: 'admin', permissions: ['customer:create'] },
    } as any)
  })

  it('rejects unauthenticated customer creation', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null as any)
    const request = new NextRequest('http://localhost:3000/api/customer', {
      method: 'POST',
      body: JSON.stringify({ password: 'password123' }),
    })

    const response = await POST(request)

    expect(response.status).toBe(401)
    expect(db.customer.create).not.toHaveBeenCalled()
  })

  it('rejects customer creation without customer:create permission', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: 'staff1', role: 'admin', permissions: ['customer:read'] },
    } as any)
    const request = new NextRequest('http://localhost:3000/api/customer', {
      method: 'POST',
      body: JSON.stringify({ password: 'password123' }),
    })

    const response = await POST(request)

    expect(response.status).toBe(403)
    expect(db.customer.create).not.toHaveBeenCalled()
  })

  it('rejects customer-role access to the admin creation endpoint', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: 'customer1', role: 'customer' },
    } as any)
    const request = new NextRequest('http://localhost:3000/api/customer', {
      method: 'POST',
      body: JSON.stringify({ password: 'password123' }),
    })

    const response = await POST(request)

    expect(response.status).toBe(403)
    expect(db.customer.create).not.toHaveBeenCalled()
  })

  it('should create a new customer', async () => {
    const newCustomerData = {
      name: 'New Customer',
      nameKana: 'ニューカスタマー',
      phone: '09087654321',
      email: 'new@example.com',
      password: 'password123',
      birthDate: '1995-05-05',
      memberType: 'regular',
    }

    const mockCreatedCustomer = {
      id: 'new-customer-id',
      ...newCustomerData,
      password: 'hashed-password',
      birthDate: new Date('1995-05-05'),
      ngCasts: [],
      reservations: [],
      reviews: [],
    }

    vi.mocked(bcrypt.hash).mockResolvedValueOnce('hashed-password' as any)
    vi.mocked(db.customer.create).mockResolvedValueOnce(mockCreatedCustomer as any)

    const request = new NextRequest('http://localhost:3000/api/customer', {
      method: 'POST',
      body: JSON.stringify(newCustomerData),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10)
    expect(db.customer.create).toHaveBeenCalledOnce()
    expect(response.status).toBe(201)
    expect(data.id).toBe('new-customer-id')
    expect(data.password).toBeUndefined()
    expect(vi.mocked(bcrypt.hash)).toHaveBeenCalledWith('password123', 10)
  })

  it('should require password field', async () => {
    const invalidData = {
      name: 'New Customer',
      nameKana: 'ニューカスタマー',
      phone: '09087654321',
      email: 'new@example.com',
      birthDate: '1995-05-05',
    }

    const request = new NextRequest('http://localhost:3000/api/customer', {
      method: 'POST',
      body: JSON.stringify(invalidData),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Password is required')
  })

  it('should handle duplicate email or phone', async () => {
    const duplicateData = {
      name: 'Duplicate Customer',
      nameKana: 'デュプリケートカスタマー',
      phone: '09012345678',
      email: 'existing@example.com',
      password: 'password123',
      birthDate: '1995-05-05',
    }

    vi.mocked(bcrypt.hash).mockResolvedValueOnce('hashed-password' as any)
    vi.mocked(db.customer.create).mockRejectedValueOnce({
      code: 'P2002',
      message: 'Unique constraint violation',
    })

    const request = new NextRequest('http://localhost:3000/api/customer', {
      method: 'POST',
      body: JSON.stringify(duplicateData),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(409)
    expect(data.error).toBe('Email or phone already exists')
  })
})

describe('PUT /api/customer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getServerSession).mockResolvedValue(null as any)
  })

  it('should require authentication', async () => {
    const request = new NextRequest('http://localhost:3000/api/customer', {
      method: 'PUT',
      body: JSON.stringify({
        id: 'customer1',
        name: 'Updated Name',
      }),
    })

    const response = await PUT(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Authentication required')
  })

  it('should prevent updating other customer data', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { id: 'customer1', role: 'customer' },
    } as any)

    const request = new NextRequest('http://localhost:3000/api/customer', {
      method: 'PUT',
      body: JSON.stringify({
        id: 'other-customer',
        name: 'Updated Name',
      }),
    })

    const response = await PUT(request)
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.error).toBe('Forbidden')
  })

  it('rejects customer updates that include fields outside notification settings', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { id: 'customer1', role: 'customer' },
    } as any)

    const request = new NextRequest('http://localhost:3000/api/customer', {
      method: 'PUT',
      body: JSON.stringify({
        id: 'customer1',
        name: 'Escalated Name',
        nameKana: 'エスカレート',
        phone: '09099999999',
        email: 'escalated@example.com',
        birthDate: '2000-01-01',
        memberType: 'vip',
        points: 999999,
        phoneVerified: true,
        phoneVerifiedAt: '2026-07-19T00:00:00.000Z',
        emailVerified: true,
        emailVerifiedAt: '2026-07-19T00:00:00.000Z',
        smsEnabled: true,
        emailNotificationEnabled: false,
      }),
    })

    const response = await PUT(request)

    expect(response.status).toBe(400)
    expect(db.customer.update).not.toHaveBeenCalled()
  })

  it('allows customers to update their own notification settings', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { id: 'customer1', role: 'customer' },
    } as any)
    vi.mocked(db.customer.update).mockResolvedValueOnce({
      id: 'customer1',
      password: 'hashed-password',
      smsEnabled: true,
      emailNotificationEnabled: false,
    } as any)

    const response = await PUT(
      new NextRequest('http://localhost:3000/api/customer', {
        method: 'PUT',
        body: JSON.stringify({
          id: 'customer1',
          smsEnabled: true,
          emailNotificationEnabled: false,
        }),
      })
    )

    expect(response.status).toBe(200)
    expect(db.customer.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'customer1' },
        data: {
          smsEnabled: true,
          emailNotificationEnabled: false,
        },
      })
    )
  })

  it('allows admins to update only supported customer fields', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { id: 'admin1', role: 'admin', permissions: ['customer:update'] },
    } as any)

    const updatedCustomerData = {
      id: 'customer1',
      name: 'Updated Customer',
      email: 'updated@example.com',
      memberType: 'vip',
      smsEnabled: true,
      emailNotificationEnabled: false,
    }

    const mockUpdatedCustomer = {
      id: 'customer1',
      name: 'Updated Customer',
      nameKana: 'テストカスタマー',
      phone: '09012345678',
      email: 'updated@example.com',
      password: 'hashed-password',
      birthDate: new Date('1990-01-01'),
      memberType: 'regular',
      points: 100,
      ngCasts: [],
      reservations: [],
      reviews: [],
    }

    vi.mocked(db.customer.update).mockResolvedValueOnce(mockUpdatedCustomer as any)

    const request = new NextRequest('http://localhost:3000/api/customer', {
      method: 'PUT',
      body: JSON.stringify(updatedCustomerData),
    })

    const response = await PUT(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.name).toBe('Updated Customer')
    expect(data.password).toBeUndefined()
    expect(db.customer.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'customer1' },
        data: expect.objectContaining({
          name: 'Updated Customer',
          email: 'updated@example.com',
          memberType: 'vip',
          smsEnabled: true,
          emailNotificationEnabled: false,
        }),
      })
    )
  })

  it('rejects server-managed fields instead of passing them to Prisma', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { id: 'admin1', role: 'admin', permissions: ['customer:update'] },
    } as any)

    const response = await PUT(
      new NextRequest('http://localhost:3000/api/customer', {
        method: 'PUT',
        body: JSON.stringify({
          id: 'customer1',
          emailVerified: true,
          resetToken: 'attacker-controlled',
        }),
      })
    )

    expect(response.status).toBe(400)
    expect(db.customer.update).not.toHaveBeenCalled()
  })

  it('rejects direct point balance updates so history cannot be bypassed', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { id: 'admin1', role: 'admin', permissions: ['customer:update'] },
    } as any)

    const response = await PUT(
      new NextRequest('http://localhost:3000/api/customer', {
        method: 'PUT',
        body: JSON.stringify({ id: 'customer1', points: 200 }),
      })
    )

    expect(response.status).toBe(400)
    expect(db.customer.update).not.toHaveBeenCalled()
  })

  it('normalizes an updated email and phone before persistence', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { id: 'admin1', role: 'admin', permissions: ['customer:update'] },
    } as any)
    vi.mocked(db.customer.update).mockResolvedValueOnce({ id: 'customer1' } as any)

    const response = await PUT(
      new NextRequest('http://localhost:3000/api/customer', {
        method: 'PUT',
        body: JSON.stringify({
          id: 'customer1',
          email: '  Updated@Example.COM ',
          phone: '090-1234-5678',
        }),
      })
    )

    expect(response.status).toBe(200)
    expect(db.customer.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: 'updated@example.com',
          phone: '09012345678',
          emailVerified: false,
          emailVerificationToken: null,
          emailVerificationExpiry: null,
          phoneVerified: false,
          phoneVerifiedAt: null,
          phoneVerificationCode: null,
          phoneVerificationExpiry: null,
          phoneVerificationAttempts: 0,
        }),
      })
    )
  })

  it('maps an email uniqueness conflict during update to 409', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { id: 'admin1', role: 'admin', permissions: ['customer:update'] },
    } as any)
    vi.mocked(db.customer.update).mockRejectedValueOnce({ code: 'P2002' })

    const response = await PUT(
      new NextRequest('http://localhost:3000/api/customer', {
        method: 'PUT',
        body: JSON.stringify({ id: 'customer1', email: 'duplicate@example.com' }),
      })
    )

    expect(response.status).toBe(409)
  })

  it('should update password with hashing', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { id: 'admin1', role: 'admin', permissions: ['customer:update'] },
    } as any)

    const updateData = {
      id: 'customer1',
      password: 'new-password',
    }

    const mockUpdatedCustomer = {
      id: 'customer1',
      name: 'Test Customer',
      nameKana: 'テストカスタマー',
      phone: '09012345678',
      email: 'test@example.com',
      password: 'new-hashed-password',
      birthDate: new Date('1990-01-01'),
      memberType: 'regular',
      points: 100,
      ngCasts: [],
      reservations: [],
      reviews: [],
    }

    vi.mocked(bcrypt.hash).mockResolvedValueOnce('new-hashed-password' as any)
    vi.mocked(db.customer.update).mockResolvedValueOnce(mockUpdatedCustomer as any)

    const request = new NextRequest('http://localhost:3000/api/customer', {
      method: 'PUT',
      body: JSON.stringify(updateData),
    })

    const response = await PUT(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(vi.mocked(bcrypt.hash)).toHaveBeenCalledWith('new-password', 10)
    expect(data.password).toBeUndefined()
  })

  it('rejects an admin without customer:update permission before updating', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { id: 'admin1', role: 'admin', permissions: ['customer:read'] },
    } as any)

    const response = await PUT(
      new NextRequest('http://localhost:3000/api/customer', {
        method: 'PUT',
        body: JSON.stringify({ id: 'customer1', points: 999999 }),
      })
    )

    expect(response.status).toBe(403)
    expect(db.customer.update).not.toHaveBeenCalled()
  })

  it('should handle non-existent customer', async () => {
    vi.mocked(db.customer.update).mockRejectedValueOnce({
      code: 'P2025',
      message: 'Record not found',
    })

    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { id: 'admin1', role: 'admin', permissions: ['customer:update'] },
    } as any)

    const request = new NextRequest('http://localhost:3000/api/customer', {
      method: 'PUT',
      body: JSON.stringify({
        id: 'customer1',
        name: 'Updated Name',
      }),
    })

    const response = await PUT(request)
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Customer not found')
  })
})

describe('DELETE /api/customer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should always return forbidden', async () => {
    const request = new NextRequest('http://localhost:3000/api/customer', {
      method: 'DELETE',
    })

    const response = await DELETE(request)
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.error).toBe('Forbidden')
  })
})

describe('Customer API - Validation Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: 'admin1', role: 'admin', permissions: ['customer:create'] },
    } as any)
  })

  it('rejects an invalid email in POST before hashing or persistence', async () => {
    const invalidEmailData = {
      name: 'Invalid Email',
      nameKana: 'インバリッドメール',
      phone: '09087654321',
      email: 'invalid-email',
      password: 'password123',
      birthDate: '1995-05-05',
    }

    const request = new NextRequest('http://localhost:3000/api/customer', {
      method: 'POST',
      body: JSON.stringify(invalidEmailData),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Invalid request')
    expect(bcrypt.hash).not.toHaveBeenCalled()
    expect(db.customer.create).not.toHaveBeenCalled()
  })

  it('rejects an invalid phone in POST before hashing or persistence', async () => {
    const invalidPhoneData = {
      name: 'Invalid Phone',
      nameKana: 'インバリッドフォン',
      phone: '123', // Too short
      email: 'valid@example.com',
      password: 'password123',
      birthDate: '1995-05-05',
    }

    const request = new NextRequest('http://localhost:3000/api/customer', {
      method: 'POST',
      body: JSON.stringify(invalidPhoneData),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Invalid request')
    expect(bcrypt.hash).not.toHaveBeenCalled()
    expect(db.customer.create).not.toHaveBeenCalled()
  })

  it('should validate birthDate format', async () => {
    const invalidDateData = {
      name: 'Invalid Date',
      nameKana: 'インバリッドデート',
      phone: '09087654321',
      email: 'valid@example.com',
      password: 'password123',
      birthDate: 'invalid-date',
    }

    const request = new NextRequest('http://localhost:3000/api/customer', {
      method: 'POST',
      body: JSON.stringify(invalidDateData),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Invalid request')
    expect(bcrypt.hash).not.toHaveBeenCalled()
    expect(db.customer.create).not.toHaveBeenCalled()
  })

  it('normalizes canonical identity fields in POST', async () => {
    vi.mocked(bcrypt.hash).mockResolvedValueOnce('hashed-password' as any)
    vi.mocked(db.customer.create).mockResolvedValueOnce({ id: 'customer1' } as any)

    const response = await POST(
      new NextRequest('http://localhost:3000/api/customer', {
        method: 'POST',
        body: JSON.stringify({
          name: ' New Customer ',
          nameKana: ' ニューカスタマー ',
          phone: '090-8765-4321',
          email: ' New@Example.COM ',
          password: 'password123',
          birthDate: '1995-05-05',
        }),
      })
    )

    expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10)
    expect(db.customer.create).toHaveBeenCalledOnce()
    expect(response.status).toBe(201)
    expect(db.customer.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: 'New Customer',
          nameKana: 'ニューカスタマー',
          phone: '09087654321',
          email: 'new@example.com',
        }),
      })
    )
  })

  it('rejects overlong bcrypt input and server-managed fields in POST', async () => {
    const response = await POST(
      new NextRequest('http://localhost:3000/api/customer', {
        method: 'POST',
        body: JSON.stringify({
          name: 'New Customer',
          nameKana: 'ニューカスタマー',
          phone: '09087654321',
          email: 'new@example.com',
          password: 'あ'.repeat(25),
          birthDate: '1995-05-05',
          emailVerified: true,
        }),
      })
    )

    expect(response.status).toBe(400)
    expect(bcrypt.hash).not.toHaveBeenCalled()
    expect(db.customer.create).not.toHaveBeenCalled()
  })

  it('rejects an initial point balance outside the point-history workflow', async () => {
    const response = await POST(
      new NextRequest('http://localhost:3000/api/customer', {
        method: 'POST',
        body: JSON.stringify({
          name: 'New Customer',
          nameKana: 'ニューカスタマー',
          phone: '09087654321',
          email: 'new@example.com',
          password: 'password123',
          birthDate: '1995-05-05',
          points: 1000,
        }),
      })
    )

    expect(response.status).toBe(400)
    expect(db.customer.create).not.toHaveBeenCalled()
  })
})
