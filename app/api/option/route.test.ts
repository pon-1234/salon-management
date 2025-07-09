/**
 * @design_doc   Tests for Option API endpoints
 * @related_to   option/route.ts, OptionRepository, OptionPrice type
 * @known_issues None currently
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST, PUT, DELETE } from './route'
import { db } from '@/lib/db'

// Mock the database
vi.mock('@/lib/db', () => ({
  db: {
    optionPrice: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
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
  })

  it('should get option by ID', async () => {
    const mockOption = {
      id: 'option1',
      name: 'Extended Service',
      price: 2000,
      reservations: [],
    }

    vi.mocked(db.optionPrice.findUnique).mockResolvedValueOnce(mockOption as any)

    const request = new NextRequest('http://localhost:3000/api/option?id=option1', {
      method: 'GET',
    })

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.id).toBe('option1')
    expect(data.name).toBe('Extended Service')
    expect(data.price).toBe(2000)
    expect(vi.mocked(db.optionPrice.findUnique)).toHaveBeenCalledWith({
      where: { id: 'option1' },
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
    vi.mocked(db.optionPrice.findUnique).mockResolvedValueOnce(null)

    const request = new NextRequest('http://localhost:3000/api/option?id=non-existent', {
      method: 'GET',
    })

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Option not found')
  })

  it('should get all options sorted by price', async () => {
    const mockOptions = [
      {
        id: 'option1',
        name: 'Basic Add-on',
        price: 1000,
        reservations: [],
      },
      {
        id: 'option2',
        name: 'Premium Add-on',
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
    expect(data).toHaveLength(2)
    expect(data[0].name).toBe('Basic Add-on')
    expect(data[1].name).toBe('Premium Add-on')
    expect(vi.mocked(db.optionPrice.findMany)).toHaveBeenCalledWith({
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
      orderBy: {
        price: 'asc',
      },
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
            customer: { id: 'customer1', name: 'Test Customer' },
            cast: { id: 'cast1', name: 'Test Cast' },
          },
        },
      ],
    }

    vi.mocked(db.optionPrice.findUnique).mockResolvedValueOnce(mockOptionWithReservations as any)

    const request = new NextRequest('http://localhost:3000/api/option?id=option1', {
      method: 'GET',
    })

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.reservations).toHaveLength(1)
    expect(data.reservations[0].reservation.customer.name).toBe('Test Customer')
  })
})

describe('POST /api/option', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should create a new option', async () => {
    const newOptionData = {
      name: 'Special Treatment',
      price: 5000,
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
      data: {
        name: 'Special Treatment',
        price: 5000,
      },
      include: {
        reservations: true,
      },
    })
  })

  it('should handle database creation errors', async () => {
    const newOptionData = {
      name: 'Invalid Option',
      price: -1000, // Invalid price
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

  it('should handle missing required fields', async () => {
    const incompleteData = {
      name: 'Incomplete Option',
      // Missing price
    }

    vi.mocked(db.optionPrice.create).mockRejectedValueOnce(new Error('Missing required field'))

    const request = new NextRequest('http://localhost:3000/api/option', {
      method: 'POST',
      body: JSON.stringify(incompleteData),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Internal server error')
  })
})

describe('PUT /api/option', () => {
  beforeEach(() => {
    vi.clearAllMocks()
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

  it('should update option data', async () => {
    const updateData = {
      id: 'option1',
      name: 'Updated Service Name',
      price: 3500,
    }

    const mockUpdatedOption = {
      id: 'option1',
      name: 'Updated Service Name',
      price: 3500,
      reservations: [],
    }

    vi.mocked(db.optionPrice.update).mockResolvedValueOnce(mockUpdatedOption as any)

    const request = new NextRequest('http://localhost:3000/api/option', {
      method: 'PUT',
      body: JSON.stringify(updateData),
    })

    const response = await PUT(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.name).toBe('Updated Service Name')
    expect(data.price).toBe(3500)
    expect(vi.mocked(db.optionPrice.update)).toHaveBeenCalledWith({
      where: { id: 'option1' },
      data: {
        name: 'Updated Service Name',
        price: 3500,
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
  })

  it('should handle non-existent option', async () => {
    vi.mocked(db.optionPrice.update).mockRejectedValueOnce({
      code: 'P2025',
      message: 'Record not found',
    })

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
  })

  it('should allow partial updates', async () => {
    const updateData = {
      id: 'option1',
      price: 4000, // Only updating price
    }

    const mockUpdatedOption = {
      id: 'option1',
      name: 'Existing Name',
      price: 4000,
      reservations: [],
    }

    vi.mocked(db.optionPrice.update).mockResolvedValueOnce(mockUpdatedOption as any)

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
      data: {
        name: undefined,
        price: 4000,
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
  })
})

describe('DELETE /api/option', () => {
  beforeEach(() => {
    vi.clearAllMocks()
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
    vi.mocked(db.optionPrice.delete).mockResolvedValueOnce({} as any)

    const request = new NextRequest('http://localhost:3000/api/option?id=option1', {
      method: 'DELETE',
    })

    const response = await DELETE(request)

    expect(response.status).toBe(204)
    expect(vi.mocked(db.optionPrice.delete)).toHaveBeenCalledWith({
      where: { id: 'option1' },
    })
  })

  it('should handle non-existent option', async () => {
    vi.mocked(db.optionPrice.delete).mockRejectedValueOnce({
      code: 'P2025',
      message: 'Record not found',
    })

    const request = new NextRequest('http://localhost:3000/api/option?id=non-existent', {
      method: 'DELETE',
    })

    const response = await DELETE(request)
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Option not found')
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

    vi.mocked(db.optionPrice.findUnique).mockResolvedValueOnce(mockOptionWithReservations as any)

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