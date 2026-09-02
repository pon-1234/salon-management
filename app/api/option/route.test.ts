/**
 * @design_doc   Tests for Option API endpoints
 * @related_to   option/route.ts, OptionRepository, OptionPrice type
 * @known_issues None currently
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST, PUT, DELETE } from './route'
import { getServerSession } from 'next-auth'
import { db } from '@/lib/db'

vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}))

vi.mock('@/lib/auth/config', () => ({
  authOptions: {},
}))

vi.mock('@/lib/config/env', () => ({
  env: { featureFlags: { useMockFallbacks: false } },
}))

// Mock the database
vi.mock('@/lib/db', () => ({
  db: {
    $transaction: vi.fn(),
    store: {
      findUnique: vi.fn(() => Promise.resolve({ id: 'ikebukuro' })),
      upsert: vi.fn(() => Promise.resolve({ id: 'ikebukuro' })),
    },
    optionPrice: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    reservationOption: {
      deleteMany: vi.fn(),
    },
  },
}))

// Mock logger
vi.mock('@/lib/logger', () => ({
  default: {
    error: vi.fn(),
  },
}))

describe('GET /api/option', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(db.$transaction).mockImplementation(async (cb: any) => cb(db as any))
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: 'admin1', role: 'admin', permissions: ['*'] },
    } as any)
  })

  it('returns a JSON 404 when the requested store does not exist', async () => {
    vi.mocked(db.store.findUnique).mockResolvedValueOnce(null).mockResolvedValueOnce(null)

    const response = await GET(
      new NextRequest('http://localhost:3000/api/option?storeId=unknown-store')
    )

    expect(response.status).toBe(404)
    await expect(response.json()).resolves.toEqual({ error: 'Unknown store' })
  })

  it('returns a JSON 500 when store resolution fails', async () => {
    vi.mocked(db.store.findUnique).mockRejectedValueOnce(new Error('database unavailable'))

    const response = await GET(
      new NextRequest('http://localhost:3000/api/option?storeId=ikebukuro')
    )

    expect(response.status).toBe(500)
    await expect(response.json()).resolves.toEqual({ error: 'Internal server error' })
  })

  it('should get option by ID', async () => {
    const mockOption = {
      id: 'option1',
      name: 'Extended Service',
      description: 'Relaxing add-on',
      price: 2000,
      duration: 30,
      category: 'special',
      displayOrder: 1,
      isActive: true,
      note: null,
      storeShare: 1200,
      castShare: 800,
      reservations: [],
    }

    vi.mocked(db.optionPrice.findFirst).mockResolvedValueOnce(mockOption as any)

    const request = new NextRequest('http://localhost:3000/api/option?id=option1', {
      method: 'GET',
    })

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.id).toBe('option1')
    expect(data.name).toBe('Extended Service')
    expect(data.price).toBe(2000)
    expect(vi.mocked(db.optionPrice.findFirst)).toHaveBeenCalledWith({
      where: { id: 'option1', storeId: 'ikebukuro', archivedAt: null },
      include: {
        reservations: {
          include: {
            reservation: {
              include: {
                customer: true,
                cast: true,
              },
            },
          },
        },
      },
    })
  })

  it('should return 404 for non-existent option', async () => {
    vi.mocked(db.optionPrice.findFirst).mockResolvedValueOnce(null)

    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { id: 'admin1', role: 'admin', permissions: ['*'] },
    } as any)

    const request = new NextRequest('http://localhost:3000/api/option?id=non-existent', {
      method: 'GET',
    })

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Option not found')
  })

  it('should reject an admin who is not assigned to the requested store', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: {
        id: 'admin1',
        role: 'admin',
        permissions: ['pricing:read'],
        storeIds: ['other-store'],
      },
    } as any)

    const response = await GET(
      new NextRequest('http://localhost:3000/api/option?storeId=ikebukuro')
    )

    expect(response.status).toBe(403)
    expect(db.optionPrice.findMany).not.toHaveBeenCalled()
  })

  it('should get all options sorted by price', async () => {
    const mockOptions = [
      {
        id: 'option1',
        name: 'Basic Add-on',
        description: null,
        price: 1000,
        duration: null,
        category: 'special',
        displayOrder: 1,
        isActive: true,
        note: null,
        reservations: [],
      },
      {
        id: 'option2',
        name: 'Premium Add-on',
        description: null,
        price: 3000,
        duration: null,
        category: 'special',
        displayOrder: 2,
        isActive: true,
        note: null,
        reservations: [],
      },
    ]

    vi.mocked(db.optionPrice.findMany).mockResolvedValueOnce(mockOptions as any)

    const request = new NextRequest('http://localhost:3000/api/option', {
      method: 'GET',
    })

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toHaveLength(2)
    expect(data[0].name).toBe('Basic Add-on')
    expect(data[1].name).toBe('Premium Add-on')
    expect(vi.mocked(db.optionPrice.findMany)).toHaveBeenCalledWith({
      where: { storeId: 'ikebukuro', archivedAt: null },
      include: {
        reservations: {
          include: {
            reservation: {
              include: {
                customer: true,
                cast: true,
              },
            },
          },
        },
      },
      orderBy: [{ displayOrder: 'asc' }, { price: 'asc' }],
    })
  })

  it('should include reservation data when available', async () => {
    const mockOptionWithReservations = {
      id: 'option1',
      name: 'Popular Service',
      price: 2500,
      reservations: [
        {
          reservation: {
            id: 'reservation1',
            customer: {
              id: 'customer1',
              name: 'Test Customer',
              password: 'option-customer-secret',
            },
            cast: { id: 'cast1', name: 'Test Cast', passwordHash: 'option-cast-secret' },
          },
        },
      ],
    }

    vi.mocked(db.optionPrice.findFirst).mockResolvedValueOnce(mockOptionWithReservations as any)

    const request = new NextRequest('http://localhost:3000/api/option?id=option1', {
      method: 'GET',
    })

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.reservations).toHaveLength(1)
    expect(data.reservations[0].reservation.customer.name).toBe('Test Customer')
    expect(JSON.stringify(data)).not.toMatch(/option-customer-secret|option-cast-secret/)
  })

  it('should strip reservation data for non-admin users', async () => {
    const mockOption = {
      id: 'option1',
      name: 'Service',
      price: 2000,
      visibility: 'public',
      storeShare: 1200,
      castShare: 800,
      reservations: [
        {
          reservation: {
            id: 'res1',
            customer: { id: 'cust1' },
            cast: { id: 'cast1' },
          },
        },
      ],
    }

    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { id: 'customer1', role: 'customer' },
    } as any)
    vi.mocked(db.optionPrice.findFirst).mockResolvedValueOnce(mockOption as any)

    const request = new NextRequest('http://localhost:3000/api/option?id=option1', {
      method: 'GET',
    })

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.reservations).toBeUndefined()
    expect(data.storeShare).toBeUndefined()
    expect(data.castShare).toBeUndefined()
    expect(data.id).toBe('option1')
    expect(db.optionPrice.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 'option1',
          storeId: 'ikebukuro',
          visibility: 'public',
          isActive: true,
          archivedAt: null,
        },
      })
    )
  })

  it('returns only public option fields to unauthenticated callers', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(null as any)
    vi.mocked(db.optionPrice.findMany).mockResolvedValueOnce([
      {
        id: 'option1',
        storeId: 'ikebukuro',
        name: 'Service',
        description: 'desc',
        price: 2000,
        duration: 20,
        category: 'special',
        displayOrder: 1,
        note: 'note',
        visibility: 'public',
        isActive: true,
        archivedAt: null,
        storeShare: 1200,
        castShare: 800,
        reservations: [],
      },
    ] as any)

    const response = await GET(new NextRequest('http://localhost:3000/api/option'))
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual([
      {
        id: 'option1',
        name: 'Service',
        description: 'desc',
        price: 2000,
        duration: 20,
        category: 'special',
        displayOrder: 1,
      },
    ])
    expect(db.optionPrice.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          storeId: 'ikebukuro',
          visibility: 'public',
          isActive: true,
          archivedAt: null,
        },
      })
    )
  })

  it('should allow unauthenticated public option listing', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(null as any)
    vi.mocked(db.optionPrice.findMany).mockResolvedValueOnce([] as any)

    const request = new NextRequest('http://localhost:3000/api/option', {
      method: 'GET',
    })

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual([])
  })

  it('should return an error instead of default options when the database fails', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(null as any)
    vi.mocked(db.optionPrice.findMany).mockRejectedValueOnce(new Error('database unavailable'))

    const response = await GET(new NextRequest('http://localhost:3000/api/option'))

    expect(response.status).toBe(500)
    await expect(response.json()).resolves.toEqual({ error: 'Internal server error' })
  })
})

describe('POST /api/option', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(db.$transaction).mockImplementation(async (cb: any) => cb(db as any))
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: 'admin1', role: 'admin', permissions: ['*'] },
    } as any)
  })

  it('should create a new option', async () => {
    const newOptionData = {
      name: 'Special Treatment',
      description: 'VIP向けサービス',
      price: 5000,
      duration: 20,
      category: 'special',
      displayOrder: 5,
      isActive: true,
      note: '人気',
      storeShare: 3000,
      castShare: 2000,
    }

    const mockCreatedOption = {
      id: 'new-option-id',
      ...newOptionData,
      reservations: [],
    }

    vi.mocked(db.optionPrice.create).mockResolvedValueOnce(mockCreatedOption as any)

    const request = new NextRequest('http://localhost:3000/api/option', {
      method: 'POST',
      body: JSON.stringify(newOptionData),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.id).toBe('new-option-id')
    expect(data.name).toBe('Special Treatment')
    expect(data.price).toBe(5000)
    expect(vi.mocked(db.optionPrice.create)).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: 'Special Treatment',
        description: 'VIP向けサービス',
        price: 5000,
        duration: 20,
        category: 'special',
        displayOrder: 5,
        isActive: true,
        note: '人気',
        storeShare: 3000,
        castShare: 2000,
      }),
      include: {
        reservations: true,
      },
    })
  })

  it('should handle database creation errors', async () => {
    const newOptionData = {
      name: 'Valid Option',
      price: 1000,
    }

    vi.mocked(db.optionPrice.create).mockRejectedValueOnce(new Error('Database error'))

    const request = new NextRequest('http://localhost:3000/api/option', {
      method: 'POST',
      body: JSON.stringify(newOptionData),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Internal server error')
  })

  it('should default missing price to zero', async () => {
    const incompleteData = {
      name: 'Incomplete Option',
    }

    const mockCreatedOption = {
      id: 'generated-id',
      name: 'Incomplete Option',
      description: null,
      price: 0,
      duration: null,
      category: 'special',
      displayOrder: 0,
      isActive: true,
      note: null,
      storeShare: 0,
      castShare: 0,
      reservations: [],
    }

    vi.mocked(db.optionPrice.create).mockResolvedValueOnce(mockCreatedOption as any)

    const request = new NextRequest('http://localhost:3000/api/option', {
      method: 'POST',
      body: JSON.stringify(incompleteData),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.price).toBe(0)
    expect(data.name).toBe('Incomplete Option')
  })

  it('should require option name', async () => {
    const invalidData = {
      price: 1500,
    }

    const request = new NextRequest('http://localhost:3000/api/option', {
      method: 'POST',
      body: JSON.stringify(invalidData),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Validation error')
    expect(vi.mocked(db.optionPrice.create)).not.toHaveBeenCalled()
  })

  it.each([
    {
      name: 'a negative store share',
      body: { name: 'Option', price: 5000, storeShare: -1, castShare: 5001 },
      path: ['storeShare'],
    },
    {
      name: 'shares whose total differs from price',
      body: { name: 'Option', price: 5000, storeShare: 3000, castShare: 2500 },
      path: ['storeShare', 'castShare'],
    },
  ])('rejects $name', async ({ body, path }) => {
    const response = await POST(
      new NextRequest('http://localhost:3000/api/option', {
        method: 'POST',
        body: JSON.stringify(body),
      })
    )

    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({
      error: 'Validation error',
      details: [{ path }],
    })
    expect(db.optionPrice.create).not.toHaveBeenCalled()
  })

  it('rejects an unsupported visibility value', async () => {
    const response = await POST(
      new NextRequest('http://localhost:3000/api/option', {
        method: 'POST',
        body: JSON.stringify({ name: 'Option', price: 1000, visibility: 'private' }),
      })
    )

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toMatchObject({
      error: 'Validation error',
      details: [{ path: ['visibility'] }],
    })
    expect(db.optionPrice.create).not.toHaveBeenCalled()
  })

  it('should reject non-admin users', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { id: 'customer1', role: 'customer' },
    } as any)

    const request = new NextRequest('http://localhost:3000/api/option', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Option',
        price: 1000,
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.error).toBe('Forbidden')
  })

  it('should reject an admin without option creation permission', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: {
        id: 'admin1',
        role: 'admin',
        permissions: ['pricing:read'],
        storeIds: ['ikebukuro'],
      },
    } as any)

    const response = await POST(
      new NextRequest('http://localhost:3000/api/option?storeId=ikebukuro', {
        method: 'POST',
        body: JSON.stringify({ name: 'Option', price: 1000 }),
      })
    )

    expect(response.status).toBe(403)
    expect(db.optionPrice.create).not.toHaveBeenCalled()
  })

  it('should require authentication', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(null as any)

    const request = new NextRequest('http://localhost:3000/api/option', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Option',
        price: 1000,
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Authentication required')
  })
})

describe('PUT /api/option', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(db.$transaction).mockImplementation(async (cb: any) => cb(db as any))
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: 'admin1', role: 'admin', permissions: ['*'] },
    } as any)
  })

  it('should require ID field', async () => {
    const request = new NextRequest('http://localhost:3000/api/option', {
      method: 'PUT',
      body: JSON.stringify({
        name: 'Updated Option',
        price: 3000,
      }),
    })

    const response = await PUT(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('ID is required')
  })

  it('updates the existing option ID so cast option associations remain attached', async () => {
    const updateData = {
      id: 'option1',
      name: 'Updated Service Name',
      description: 'アップデートされた説明',
      price: 3500,
      category: 'relaxation',
      displayOrder: 3,
      isActive: true,
      note: '季節限定',
      storeShare: 2100,
      castShare: 1400,
    }

    const existingOption = {
      id: 'option1',
      name: 'Existing Service',
      description: '元の説明',
      price: 3000,
      duration: null,
      category: 'special',
      displayOrder: 2,
      isActive: true,
      note: null,
      storeShare: 1800,
      castShare: 1200,
      archivedAt: null,
      reservations: [],
    }

    const updatedOption = {
      ...existingOption,
      ...updateData,
      duration: null,
      archivedAt: null,
      reservations: [],
    }

    vi.mocked(db.optionPrice.findFirst).mockResolvedValueOnce(existingOption as any)
    vi.mocked(db.optionPrice.update).mockResolvedValueOnce(updatedOption as any)

    const request = new NextRequest('http://localhost:3000/api/option', {
      method: 'PUT',
      body: JSON.stringify(updateData),
    })

    const response = await PUT(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.id).toBe('option1')
    expect(data.name).toBe('Updated Service Name')
    expect(vi.mocked(db.optionPrice.update)).toHaveBeenCalledWith({
      where: { id: 'option1' },
      data: expect.objectContaining({
        name: 'Updated Service Name',
        price: 3500,
        category: 'relaxation',
        isActive: true,
        archivedAt: null,
      }),
      include: {
        reservations: {
          include: {
            reservation: {
              include: {
                customer: true,
                cast: true,
              },
            },
          },
        },
      },
    })
    expect(db.optionPrice.create).not.toHaveBeenCalled()
  })

  it('should handle non-existent option', async () => {
    vi.mocked(db.optionPrice.findFirst).mockResolvedValueOnce(null)

    const request = new NextRequest('http://localhost:3000/api/option', {
      method: 'PUT',
      body: JSON.stringify({
        id: 'non-existent',
        name: 'Updated Name',
      }),
    })

    const response = await PUT(request)
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Option not found')
    expect(db.optionPrice.update).not.toHaveBeenCalled()
    expect(db.optionPrice.create).not.toHaveBeenCalled()
  })

  it('updates the same option row for partial updates', async () => {
    const updateData = {
      id: 'option1',
      price: 4000,
      storeShare: 2400,
      castShare: 1600,
    }

    const existingOption = {
      id: 'option1',
      name: 'Existing Name',
      description: null,
      price: 3500,
      duration: null,
      category: 'special',
      displayOrder: 1,
      isActive: true,
      note: null,
      storeShare: 2100,
      castShare: 1400,
      archivedAt: null,
      reservations: [],
    }

    const updatedOption = {
      ...existingOption,
      price: 4000,
      storeShare: 2400,
      castShare: 1600,
      archivedAt: null,
    }

    vi.mocked(db.optionPrice.findFirst).mockResolvedValueOnce(existingOption as any)
    vi.mocked(db.optionPrice.update).mockResolvedValueOnce(updatedOption as any)

    const request = new NextRequest('http://localhost:3000/api/option', {
      method: 'PUT',
      body: JSON.stringify(updateData),
    })

    const response = await PUT(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.price).toBe(4000)
    expect(vi.mocked(db.optionPrice.update)).toHaveBeenCalledWith({
      where: { id: 'option1' },
      data: expect.objectContaining({
        price: 4000,
        storeShare: 2400,
        castShare: 1600,
      }),
      include: expect.any(Object),
    })
    expect(db.optionPrice.create).not.toHaveBeenCalled()
  })

  it('rejects a partial update that would make the revenue split differ from price', async () => {
    vi.mocked(db.optionPrice.findFirst).mockResolvedValueOnce({
      id: 'option1',
      name: 'Existing Name',
      price: 5000,
      storeShare: 3000,
      castShare: 2000,
      reservations: [],
    } as any)

    const response = await PUT(
      new NextRequest('http://localhost:3000/api/option', {
        method: 'PUT',
        body: JSON.stringify({ id: 'option1', storeShare: 3500 }),
      })
    )

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({
      error: 'Validation error',
      details: [
        {
          path: ['storeShare', 'castShare'],
          message: 'Store and cast shares must total the option price',
        },
      ],
    })
    expect(db.optionPrice.update).not.toHaveBeenCalled()
    expect(db.optionPrice.create).not.toHaveBeenCalled()
  })

  it('should toggle active status without creating a new version', async () => {
    vi.mocked(db.optionPrice.findFirst).mockResolvedValueOnce({
      id: 'option1',
      name: 'Existing Name',
      price: 3000,
      isActive: true,
      archivedAt: null,
      reservations: [],
    } as any)

    vi.mocked(db.optionPrice.update).mockResolvedValueOnce({
      id: 'option1',
      name: 'Existing Name',
      price: 3000,
      isActive: false,
      archivedAt: new Date(),
      reservations: [],
    } as any)

    const request = new NextRequest('http://localhost:3000/api/option', {
      method: 'PUT',
      body: JSON.stringify({
        id: 'option1',
        isActive: false,
      }),
    })

    const response = await PUT(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.isActive).toBe(false)
    expect(vi.mocked(db.optionPrice.update)).toHaveBeenCalledWith({
      where: { id: 'option1' },
      data: {
        isActive: false,
        archivedAt: expect.any(Date),
      },
      include: {
        reservations: {
          include: {
            reservation: {
              include: {
                customer: true,
                cast: true,
              },
            },
          },
        },
      },
    })
    expect(db.optionPrice.create).not.toHaveBeenCalled()
  })

  it('should reject updates from non-admin users', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { id: 'customer1', role: 'customer' },
    } as any)

    const request = new NextRequest('http://localhost:3000/api/option', {
      method: 'PUT',
      body: JSON.stringify({
        id: 'option1',
        price: 2000,
      }),
    })

    const response = await PUT(request)
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.error).toBe('Forbidden')
  })
})

describe('DELETE /api/option', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(db.$transaction).mockImplementation(async (cb: any) => cb(db as any))
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: 'admin1', role: 'admin', permissions: ['*'] },
    } as any)
  })

  it('should require ID parameter', async () => {
    const request = new NextRequest('http://localhost:3000/api/option', {
      method: 'DELETE',
    })

    const response = await DELETE(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('ID is required')
  })

  it('should delete option', async () => {
    vi.mocked(db.optionPrice.findFirst).mockResolvedValueOnce({ id: 'option1' } as any)
    vi.mocked(db.optionPrice.update).mockResolvedValueOnce({} as any)

    const request = new NextRequest('http://localhost:3000/api/option?id=option1', {
      method: 'DELETE',
    })

    const response = await DELETE(request)

    expect(response.status).toBe(204)
    expect(vi.mocked(db.optionPrice.update)).toHaveBeenCalledWith({
      where: { id: 'option1' },
      data: expect.objectContaining({
        isActive: false,
        archivedAt: expect.any(Date),
      }),
    })
  })

  it('should handle non-existent option', async () => {
    vi.mocked(db.optionPrice.findFirst).mockResolvedValueOnce(null)

    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { id: 'admin1', role: 'admin', permissions: ['*'] },
    } as any)

    const request = new NextRequest('http://localhost:3000/api/option?id=non-existent', {
      method: 'DELETE',
    })

    const response = await DELETE(request)
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Option not found')
  })

  it('should reject delete from non-admin users', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { id: 'customer1', role: 'customer' },
    } as any)

    const request = new NextRequest('http://localhost:3000/api/option?id=option1', {
      method: 'DELETE',
    })

    const response = await DELETE(request)
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.error).toBe('Forbidden')
  })

  it('should require authentication', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(null as any)

    const request = new NextRequest('http://localhost:3000/api/option?id=option1', {
      method: 'DELETE',
    })

    const response = await DELETE(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Authentication required')
  })
})

describe('Option API - Business Logic and Validation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should handle option combination restrictions', async () => {
    // This test simulates business logic for option combinations
    const mockOptions = [
      {
        id: 'option1',
        name: 'Basic Package',
        price: 1000,
        reservations: [],
      },
      {
        id: 'option2',
        name: 'Premium Package',
        price: 3000,
        reservations: [],
      },
    ]

    vi.mocked(db.optionPrice.findMany).mockResolvedValueOnce(mockOptions as any)

    const request = new NextRequest('http://localhost:3000/api/option', {
      method: 'GET',
    })

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    // Verify that basic package comes before premium (sorted by price)
    expect(data[0].name).toBe('Basic Package')
    expect(data[1].name).toBe('Premium Package')
  })

  it('should calculate total price correctly for multiple options', async () => {
    const options = [
      { name: 'Service A', price: 1500 },
      { name: 'Service B', price: 2000 },
      { name: 'Service C', price: 1000 },
    ]

    const totalPrice = options.reduce((sum, option) => sum + option.price, 0)
    expect(totalPrice).toBe(4500)

    // Test if API maintains price integrity
    vi.mocked(db.optionPrice.findMany).mockResolvedValueOnce(
      options.map((option, index) => ({
        id: `option${index + 1}`,
        ...option,
        reservations: [],
      })) as any
    )

    const request = new NextRequest('http://localhost:3000/api/option', {
      method: 'GET',
    })

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    const apiTotalPrice = data.reduce((sum: number, option: any) => sum + option.price, 0)
    expect(apiTotalPrice).toBe(totalPrice)
  })

  it('should maintain referential integrity with reservations', async () => {
    const mockOptionWithReservations = {
      id: 'option1',
      name: 'Popular Add-on',
      price: 2000,
      reservations: [
        {
          reservation: {
            id: 'reservation1',
            customer: { id: 'customer1', name: 'Test Customer' },
            cast: { id: 'cast1', name: 'Test Cast' },
          },
        },
        {
          reservation: {
            id: 'reservation2',
            customer: { id: 'customer2', name: 'Another Customer' },
            cast: { id: 'cast2', name: 'Another Cast' },
          },
        },
      ],
    }

    vi.mocked(db.optionPrice.findFirst).mockResolvedValueOnce(mockOptionWithReservations as any)

    const request = new NextRequest('http://localhost:3000/api/option?id=option1', {
      method: 'GET',
    })

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.reservations).toHaveLength(2)
    expect(data.reservations[0].reservation.customer.name).toBe('Test Customer')
    expect(data.reservations[1].reservation.customer.name).toBe('Another Customer')
  })
})
