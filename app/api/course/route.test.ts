/**
 * @design_doc   Tests for Course API endpoints
 * @related_to   course/route.ts, CourseRepository, CoursePrice type
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
    coursePrice: {
      findFirst: vi.fn(),
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

describe('GET /api/course', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(db.$transaction).mockImplementation(async (cb: any) => cb(db as any))
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: 'admin1', role: 'admin', permissions: ['*'] },
    } as any)
  })

  it('returns a JSON 404 when the requested store does not exist', async () => {
    vi.mocked(db.store.findUnique).mockResolvedValueOnce(null)

    const response = await GET(
      new NextRequest('http://localhost:3000/api/course?storeId=unknown-store')
    )

    expect(response.status).toBe(404)
    await expect(response.json()).resolves.toEqual({ error: 'Unknown store' })
  })

  it('returns a JSON 500 when store resolution fails', async () => {
    vi.mocked(db.store.findUnique).mockRejectedValueOnce(new Error('database unavailable'))

    const response = await GET(
      new NextRequest('http://localhost:3000/api/course?storeId=database-failure')
    )

    expect(response.status).toBe(500)
    await expect(response.json()).resolves.toEqual({ error: 'Internal server error' })
  })

  it('should get course by ID', async () => {
    const mockCourse = {
      id: 'course1',
      name: '60-minute Course',
      duration: 60,
      price: 10000,
      description: 'Standard 60-minute session',
      reservations: [
        {
          customer: { id: 'customer-1', password: 'course-customer-secret' },
          cast: { id: 'cast-1', passwordHash: 'course-cast-secret' },
        },
      ],
    }

    vi.mocked(db.coursePrice.findFirst).mockResolvedValueOnce(mockCourse as any)

    const request = new NextRequest('http://localhost:3000/api/course?id=course1', {
      method: 'GET',
    })

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.id).toBe('course1')
    expect(data.name).toBe('60-minute Course')
    expect(JSON.stringify(data)).not.toMatch(/course-customer-secret|course-cast-secret/)
    expect(vi.mocked(db.coursePrice.findFirst)).toHaveBeenCalledWith({
      where: { id: 'course1', storeId: 'ikebukuro' },
      include: {
        reservations: {
          include: {
            customer: true,
            cast: true,
          },
        },
      },
    })
  })

  it('should return 404 for non-existent course', async () => {
    vi.mocked(db.coursePrice.findFirst).mockResolvedValueOnce(null)

    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { id: 'admin1', role: 'admin', permissions: ['*'] },
    } as any)

    const request = new NextRequest('http://localhost:3000/api/course?id=non-existent', {
      method: 'GET',
    })

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Course not found')
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
      new NextRequest('http://localhost:3000/api/course?storeId=ikebukuro')
    )

    expect(response.status).toBe(403)
    expect(db.coursePrice.findMany).not.toHaveBeenCalled()
  })

  it('should get all courses sorted by duration', async () => {
    const mockCourses = [
      {
        id: 'course1',
        name: '30-minute Course',
        duration: 30,
        price: 5000,
        description: 'Quick 30-minute session',
        reservations: [],
      },
      {
        id: 'course2',
        name: '60-minute Course',
        duration: 60,
        price: 10000,
        description: 'Standard 60-minute session',
        reservations: [],
      },
    ]

    vi.mocked(db.coursePrice.findMany).mockResolvedValueOnce(mockCourses as any)

    const request = new NextRequest('http://localhost:3000/api/course', {
      method: 'GET',
    })

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toHaveLength(2)
    expect(vi.mocked(db.coursePrice.findMany)).toHaveBeenCalledWith({
      where: {
        isActive: true,
        storeId: 'ikebukuro',
      },
      include: {
        reservations: {
          include: {
            customer: true,
            cast: true,
          },
        },
      },
      orderBy: {
        duration: 'asc',
      },
    })
  })

  it('should strip reservation data for non-admin users', async () => {
    const mockCourse = {
      id: 'course1',
      name: 'Course',
      duration: 60,
      price: 10000,
      description: 'desc',
      storeShare: 6000,
      castShare: 4000,
      reservations: [
        {
          customer: { id: 'cust1' },
          cast: { id: 'cast1' },
        },
      ],
    }

    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { id: 'customer1', role: 'customer' },
    } as any)
    vi.mocked(db.coursePrice.findFirst).mockResolvedValueOnce(mockCourse as any)

    const request = new NextRequest('http://localhost:3000/api/course?id=course1', {
      method: 'GET',
    })

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.reservations).toBeUndefined()
    expect(data.storeShare).toBeUndefined()
    expect(data.castShare).toBeUndefined()
    expect(data.id).toBe('course1')
    expect(db.coursePrice.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 'course1',
          storeId: 'ikebukuro',
          isActive: true,
          archivedAt: null,
          enableWebBooking: true,
        },
      })
    )
  })

  it('returns only public course fields to unauthenticated callers', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(null as any)
    vi.mocked(db.coursePrice.findMany).mockResolvedValueOnce([
      {
        id: 'course1',
        storeId: 'ikebukuro',
        name: 'Course',
        duration: 60,
        price: 10000,
        description: 'desc',
        enableWebBooking: true,
        isActive: true,
        archivedAt: null,
        storeShare: 6000,
        castShare: 4000,
        reservations: [],
      },
    ] as any)

    const response = await GET(new NextRequest('http://localhost:3000/api/course'))
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual([
      {
        id: 'course1',
        name: 'Course',
        duration: 60,
        price: 10000,
        description: 'desc',
      },
    ])
    expect(db.coursePrice.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          isActive: true,
          archivedAt: null,
          enableWebBooking: true,
          storeId: 'ikebukuro',
        },
      })
    )
  })

  it('should allow unauthenticated public course listing', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(null as any)
    vi.mocked(db.coursePrice.findMany).mockResolvedValueOnce([] as any)

    const request = new NextRequest('http://localhost:3000/api/course', {
      method: 'GET',
    })

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual([])
  })
})

describe('POST /api/course', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(db.$transaction).mockImplementation(async (cb: any) => cb(db as any))
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: 'admin1', role: 'admin', permissions: ['*'] },
    } as any)
  })

  it('should create a new course', async () => {
    const newCourseData = {
      name: '90-minute Course',
      duration: 90,
      price: 15000,
      description: 'Extended 90-minute session',
    }

    const mockCreatedCourse = {
      id: 'new-course-id',
      ...newCourseData,
      reservations: [],
    }

    vi.mocked(db.coursePrice.create).mockResolvedValueOnce(mockCreatedCourse as any)

    const request = new NextRequest('http://localhost:3000/api/course', {
      method: 'POST',
      body: JSON.stringify(newCourseData),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.id).toBe('new-course-id')
    expect(data.name).toBe('90-minute Course')
    expect(vi.mocked(db.coursePrice.create)).toHaveBeenCalledWith({
      data: {
        name: '90-minute Course',
        description: 'Extended 90-minute session',
        duration: 90,
        enableWebBooking: true,
        price: 15000,
        storeId: 'ikebukuro',
      },
      include: {
        reservations: true,
      },
    })
  })

  it('should default description to empty string if not provided', async () => {
    const newCourseData = {
      name: '120-minute Course',
      duration: 120,
      price: 20000,
    }

    const mockCreatedCourse = {
      id: 'new-course-id',
      ...newCourseData,
      description: '',
      reservations: [],
    }

    vi.mocked(db.coursePrice.create).mockResolvedValueOnce(mockCreatedCourse as any)

    const request = new NextRequest('http://localhost:3000/api/course', {
      method: 'POST',
      body: JSON.stringify(newCourseData),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(vi.mocked(db.coursePrice.create)).toHaveBeenCalledWith({
      data: {
        name: '120-minute Course',
        description: '',
        duration: 120,
        enableWebBooking: true,
        price: 20000,
        storeId: 'ikebukuro',
      },
      include: {
        reservations: true,
      },
    })
  })

  it('should handle database creation errors', async () => {
    const newCourseData = {
      name: 'Invalid Course',
      duration: -30, // Invalid duration
      price: 5000,
    }

    const request = new NextRequest('http://localhost:3000/api/course', {
      method: 'POST',
      body: JSON.stringify(newCourseData),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Validation error')
  })

  it('should reject non-admin users', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { id: 'customer1', role: 'customer' },
    } as any)

    const request = new NextRequest('http://localhost:3000/api/course', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Course',
        duration: 60,
        price: 10000,
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.error).toBe('Forbidden')
  })

  it('should reject an admin without course creation permission', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: {
        id: 'admin1',
        role: 'admin',
        permissions: ['pricing:read'],
        storeIds: ['ikebukuro'],
      },
    } as any)

    const response = await POST(
      new NextRequest('http://localhost:3000/api/course?storeId=ikebukuro', {
        method: 'POST',
        body: JSON.stringify({ name: 'Course', duration: 60, price: 10000 }),
      })
    )

    expect(response.status).toBe(403)
    expect(db.coursePrice.create).not.toHaveBeenCalled()
  })

  it('should require authentication', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(null as any)

    const request = new NextRequest('http://localhost:3000/api/course', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Course',
        duration: 60,
        price: 10000,
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Authentication required')
  })
})

describe('PUT /api/course', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(db.$transaction).mockImplementation(async (cb: any) => cb(db as any))
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: 'admin1', role: 'admin', permissions: ['*'] },
    } as any)
  })

  it('should require ID field', async () => {
    const request = new NextRequest('http://localhost:3000/api/course', {
      method: 'PUT',
      body: JSON.stringify({
        name: 'Updated Course',
        price: 12000,
      }),
    })

    const response = await PUT(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('ID is required')
  })

  it('should create a new course version on update', async () => {
    const updateData = {
      id: 'course1',
      name: 'Updated Course Name',
      price: 12000,
      description: 'Updated description',
    }

    const existingCourse = {
      id: 'course1',
      name: 'Original Course Name',
      duration: 60,
      price: 10000,
      description: 'Original description',
      storeShare: 6000,
      castShare: 4000,
      isActive: true,
      archivedAt: null,
      reservations: [],
    }

    const newCourseVersion = {
      id: 'course1-v2',
      name: 'Updated Course Name',
      duration: 60,
      price: 12000,
      description: 'Updated description',
      storeShare: 7200,
      castShare: 4800,
      isActive: true,
      archivedAt: null,
      reservations: [],
    }

    vi.mocked(db.coursePrice.findFirst).mockResolvedValueOnce(existingCourse as any)
    vi.mocked(db.coursePrice.update).mockResolvedValueOnce(existingCourse as any)
    vi.mocked(db.coursePrice.create).mockResolvedValueOnce(newCourseVersion as any)

    const request = new NextRequest('http://localhost:3000/api/course', {
      method: 'PUT',
      body: JSON.stringify(updateData),
    })

    const response = await PUT(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.id).toBe('course1-v2')
    expect(data.name).toBe('Updated Course Name')
    expect(data.price).toBe(12000)
    expect(vi.mocked(db.coursePrice.update)).toHaveBeenCalledWith({
      where: { id: 'course1' },
      data: expect.objectContaining({
        isActive: false,
        archivedAt: expect.any(Date),
      }),
    })
    expect(vi.mocked(db.coursePrice.create)).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: 'Updated Course Name',
        price: 12000,
        description: 'Updated description',
        isActive: true,
        archivedAt: null,
      }),
      include: {
        reservations: {
          include: {
            customer: true,
            cast: true,
          },
        },
      },
    })
  })

  it('should handle non-existent course', async () => {
    vi.mocked(db.coursePrice.findFirst).mockResolvedValueOnce(null)

    const request = new NextRequest('http://localhost:3000/api/course', {
      method: 'PUT',
      body: JSON.stringify({
        id: 'non-existent',
        name: 'Updated Name',
      }),
    })

    const response = await PUT(request)
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Course not found')
    expect(db.coursePrice.update).not.toHaveBeenCalled()
    expect(db.coursePrice.create).not.toHaveBeenCalled()
  })

  it('should reject updates from non-admin users', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { id: 'customer1', role: 'customer' },
    } as any)

    const request = new NextRequest('http://localhost:3000/api/course', {
      method: 'PUT',
      body: JSON.stringify({
        id: 'course1',
        name: 'Updated',
      }),
    })

    const response = await PUT(request)
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.error).toBe('Forbidden')
  })
})

describe('DELETE /api/course', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(db.$transaction).mockImplementation(async (cb: any) => cb(db as any))
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: 'admin1', role: 'admin', permissions: ['*'] },
    } as any)
  })

  it('should require ID parameter', async () => {
    const request = new NextRequest('http://localhost:3000/api/course', {
      method: 'DELETE',
    })

    const response = await DELETE(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('ID is required')
  })

  it('should archive course instead of hard delete', async () => {
    vi.mocked(db.coursePrice.findFirst).mockResolvedValueOnce({ id: 'course1' } as any)
    vi.mocked(db.coursePrice.update).mockResolvedValueOnce({} as any)

    const request = new NextRequest('http://localhost:3000/api/course?id=course1', {
      method: 'DELETE',
    })

    const response = await DELETE(request)

    expect(response.status).toBe(204)
    expect(vi.mocked(db.coursePrice.update)).toHaveBeenCalledWith({
      where: { id: 'course1' },
      data: expect.objectContaining({
        isActive: false,
        archivedAt: expect.any(Date),
      }),
    })
  })

  it('should handle non-existent course', async () => {
    vi.mocked(db.coursePrice.findFirst).mockResolvedValueOnce(null)

    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { id: 'admin1', role: 'admin', permissions: ['*'] },
    } as any)

    const request = new NextRequest('http://localhost:3000/api/course?id=non-existent', {
      method: 'DELETE',
    })

    const response = await DELETE(request)
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Course not found')
  })

  it('should reject delete from non-admin users', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { id: 'customer1', role: 'customer' },
    } as any)

    const request = new NextRequest('http://localhost:3000/api/course?id=course1', {
      method: 'DELETE',
    })

    const response = await DELETE(request)
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.error).toBe('Forbidden')
  })

  it('should require authentication', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(null as any)

    const request = new NextRequest('http://localhost:3000/api/course?id=course1', {
      method: 'DELETE',
    })

    const response = await DELETE(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Authentication required')
  })
})

describe('Course API - Validation and Edge Cases', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should handle invalid JSON in POST request', async () => {
    const request = new NextRequest('http://localhost:3000/api/course', {
      method: 'POST',
      body: 'invalid-json',
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Internal server error')
  })

  it('should handle course price calculations correctly', async () => {
    const courseData = {
      name: 'Premium Course',
      duration: 120,
      price: 25000,
      description: 'Premium 2-hour session',
    }

    const mockCourse = {
      id: 'premium-course',
      ...courseData,
      reservations: [],
    }

    vi.mocked(db.coursePrice.create).mockResolvedValueOnce(mockCourse as any)

    const request = new NextRequest('http://localhost:3000/api/course', {
      method: 'POST',
      body: JSON.stringify(courseData),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.price).toBe(25000)
    expect(data.duration).toBe(120)
    // Price per minute should be ~208.33 yen
    const pricePerMinute = data.price / data.duration
    expect(pricePerMinute).toBeCloseTo(208.33, 2)
  })

  it('should maintain referential integrity with reservations', async () => {
    const mockCourseWithReservations = {
      id: 'course1',
      name: '60-minute Course',
      duration: 60,
      price: 10000,
      description: 'Standard session',
      reservations: [
        {
          id: 'reservation1',
          customer: { id: 'customer1', name: 'Test Customer' },
          cast: { id: 'cast1', name: 'Test Cast' },
        },
      ],
    }

    vi.mocked(db.coursePrice.findFirst).mockResolvedValueOnce(mockCourseWithReservations as any)

    const request = new NextRequest('http://localhost:3000/api/course?id=course1', {
      method: 'GET',
    })

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.reservations).toHaveLength(1)
    expect(data.reservations[0].customer.name).toBe('Test Customer')
  })
})
