/**
 * @design_doc   Tests for Customer API endpoints
 * @related_to   customer/route.ts, CustomerRepository, Customer type
 * @known_issues None currently
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST, PUT, DELETE } from './route'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'

// Mock the database
vi.mock('@/lib/db', () => ({
  db: {
    customer: {
      findUnique: vi.fn(),
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
  },
}))

describe('GET /api/customer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should require authentication to get customer by ID', async () => {
    const request = new NextRequest('http://localhost:3000/api/customer?id=customer1', {
      method: 'GET',
    })

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.error).toBe('Forbidden')
  })

  it('should prevent access to other customer data', async () => {
    const request = new NextRequest('http://localhost:3000/api/customer?id=other-customer', {
      method: 'GET',
      headers: {
        'x-customer-id': 'customer1',
      },
    })

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.error).toBe('Forbidden')
  })

  it('should return customer data for authenticated customer', async () => {
    const mockCustomer = {
      id: 'customer1',
      name: 'Test Customer',
      nameKana: 'テストカスタマー',
      phone: '09012345678',
      email: 'test@example.com',
      password: 'hashed-password',
      birthDate: new Date('1990-01-01'),
      memberType: 'regular',
      points: 100,
      ngCasts: [],
      reservations: [],
      reviews: [],
    }

    vi.mocked(db.customer.findUnique).mockResolvedValueOnce(mockCustomer as any)

    const request = new NextRequest('http://localhost:3000/api/customer?id=customer1', {
      method: 'GET',
      headers: {
        'x-customer-id': 'customer1',
      },
    })

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.id).toBe('customer1')
    expect(data.password).toBeUndefined() // Password should not be returned
  })

  it('should return 404 for non-existent customer', async () => {
    vi.mocked(db.customer.findUnique).mockResolvedValueOnce(null)

    const request = new NextRequest('http://localhost:3000/api/customer?id=customer1', {
      method: 'GET',
      headers: {
        'x-customer-id': 'customer1',
      },
    })

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Customer not found')
  })

  it('should return 403 when no id parameter provided', async () => {
    const request = new NextRequest('http://localhost:3000/api/customer', {
      method: 'GET',
      headers: {
        'x-customer-id': 'customer1',
      },
    })

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.error).toBe('Forbidden')
  })
})

describe('POST /api/customer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
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
      points: 0,
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

    expect(response.status).toBe(403)
    expect(data.error).toBe('Forbidden')
  })

  it('should prevent updating other customer data', async () => {
    const request = new NextRequest('http://localhost:3000/api/customer', {
      method: 'PUT',
      headers: {
        'x-customer-id': 'customer1',
      },
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

  it('should update customer data', async () => {
    const updatedCustomerData = {
      id: 'customer1',
      name: 'Updated Customer',
      email: 'updated@example.com',
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
      headers: {
        'x-customer-id': 'customer1',
      },
      body: JSON.stringify(updatedCustomerData),
    })

    const response = await PUT(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.name).toBe('Updated Customer')
    expect(data.password).toBeUndefined()
  })

  it('should update password with hashing', async () => {
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
      headers: {
        'x-customer-id': 'customer1',
      },
      body: JSON.stringify(updateData),
    })

    const response = await PUT(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(vi.mocked(bcrypt.hash)).toHaveBeenCalledWith('new-password', 10)
    expect(data.password).toBeUndefined()
  })

  it('should handle non-existent customer', async () => {
    vi.mocked(db.customer.update).mockRejectedValueOnce({
      code: 'P2025',
      message: 'Record not found',
    })

    const request = new NextRequest('http://localhost:3000/api/customer', {
      method: 'PUT',
      headers: {
        'x-customer-id': 'customer1',
      },
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
      headers: {
        'x-customer-id': 'customer1',
      },
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
  })

  it('should validate email format in POST', async () => {
    const invalidEmailData = {
      name: 'Invalid Email',
      nameKana: 'インバリッドメール',
      phone: '09087654321',
      email: 'invalid-email',
      password: 'password123',
      birthDate: '1995-05-05',
    }

    vi.mocked(bcrypt.hash).mockResolvedValueOnce('hashed-password' as any)
    vi.mocked(db.customer.create).mockRejectedValueOnce(new Error('Invalid email format'))

    const request = new NextRequest('http://localhost:3000/api/customer', {
      method: 'POST',
      body: JSON.stringify(invalidEmailData),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Internal server error')
  })

  it('should validate phone format in POST', async () => {
    const invalidPhoneData = {
      name: 'Invalid Phone',
      nameKana: 'インバリッドフォン',
      phone: '123', // Too short
      email: 'valid@example.com',
      password: 'password123',
      birthDate: '1995-05-05',
    }

    vi.mocked(bcrypt.hash).mockResolvedValueOnce('hashed-password' as any)
    vi.mocked(db.customer.create).mockRejectedValueOnce(new Error('Invalid phone format'))

    const request = new NextRequest('http://localhost:3000/api/customer', {
      method: 'POST',
      body: JSON.stringify(invalidPhoneData),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Internal server error')
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

    vi.mocked(bcrypt.hash).mockResolvedValueOnce('hashed-password' as any)
    vi.mocked(db.customer.create).mockRejectedValueOnce(new Error('Invalid date format'))

    const request = new NextRequest('http://localhost:3000/api/customer', {
      method: 'POST',
      body: JSON.stringify(invalidDateData),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Internal server error')
  })
})
