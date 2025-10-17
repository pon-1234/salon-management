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

// Mock the database
vi.mock('@/lib/db', () => ({
  db: {
    coursePrice: {
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
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: 'admin1', role: 'admin' },
    } as any)
  })

  it('should get course by ID', async () => {
    const mockCourse = {
      id: 'course1',
      name: '60-minute Course',
      duration: 60,
      price: 10000,
      description: 'Standard 60-minute session',
      reservations: [],
    }

    vi.mocked(db.coursePrice.findUnique).mockResolvedValueOnce(mockCourse as any)

    const request = new NextRequest('http://localhost:3000/api/course?id=course1', {
      method: 'GET',
    })

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.id).toBe('course1')
    expect(data.name).toBe('60-minute Course')
    expect(vi.mocked(db.coursePrice.findUnique)).toHaveBeenCalledWith({
      where: { id: 'course1' },
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
    vi.mocked(db.coursePrice.findUnique).mockResolvedValueOnce(null)

    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { id: 'admin1', role: 'admin' },
    } as any)

    const request = new NextRequest('http://localhost:3000/api/course?id=non-existent', {
      method: 'GET',
    })

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Course not found')
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
    vi.mocked(db.coursePrice.findUnique).mockResolvedValueOnce(mockCourse as any)

    const request = new NextRequest('http://localhost:3000/api/course?id=course1', {
      method: 'GET',
    })

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.reservations).toBeUndefined()
    expect(data.id).toBe('course1')
  })

  it('should require authentication', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(null as any)

    const request = new NextRequest('http://localhost:3000/api/course', {
      method: 'GET',
    })

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Authentication required')
  })
})

describe('POST /api/course', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: 'admin1', role: 'admin' },
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
        price: 15000,
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
        price: 20000,
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
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: 'admin1', role: 'admin' },
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

  it('should update course data', async () => {
    const updateData = {
      id: 'course1',
      name: 'Updated Course Name',
      price: 12000,
      description: 'Updated description',
    }

    const mockUpdatedCourse = {
      id: 'course1',
      name: 'Updated Course Name',
      duration: 60,
      price: 12000,
      description: 'Updated description',
      reservations: [],
    }

    vi.mocked(db.coursePrice.update).mockResolvedValueOnce(mockUpdatedCourse as any)

    const request = new NextRequest('http://localhost:3000/api/course', {
      method: 'PUT',
      body: JSON.stringify(updateData),
    })

    const response = await PUT(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.name).toBe('Updated Course Name')
    expect(data.price).toBe(12000)
    expect(vi.mocked(db.coursePrice.update)).toHaveBeenCalledWith({
      where: { id: 'course1' },
      data: expect.objectContaining({
        name: 'Updated Course Name',
        price: 12000,
        description: 'Updated description',
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
    vi.mocked(db.coursePrice.update).mockRejectedValueOnce({
      code: 'P2025',
      message: 'Record not found',
    })

    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { id: 'admin1', role: 'admin' },
    } as any)

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
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: 'admin1', role: 'admin' },
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

  it('should delete course', async () => {
    vi.mocked(db.coursePrice.delete).mockResolvedValueOnce({} as any)

    const request = new NextRequest('http://localhost:3000/api/course?id=course1', {
      method: 'DELETE',
    })

    const response = await DELETE(request)

    expect(response.status).toBe(204)
    expect(vi.mocked(db.coursePrice.delete)).toHaveBeenCalledWith({
      where: { id: 'course1' },
    })
  })

  it('should handle non-existent course', async () => {
    vi.mocked(db.coursePrice.delete).mockRejectedValueOnce({
      code: 'P2025',
      message: 'Record not found',
    })

    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { id: 'admin1', role: 'admin' },
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

    vi.mocked(db.coursePrice.findUnique).mockResolvedValueOnce(mockCourseWithReservations as any)

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
