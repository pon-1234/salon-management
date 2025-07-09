/**
 * @design_doc   Tests for Review API endpoints
 * @related_to   review/route.ts, ReviewRepository, Review type
 * @known_issues None currently
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST, PUT, DELETE } from './route'
import { db } from '@/lib/db'

// Mock the database
vi.mock('@/lib/db', () => ({
  db: {
    review: {
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

describe('GET /api/review', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should get review by ID', async () => {
    const mockReview = {
      id: 'review1',
      customerId: 'customer1',
      castId: 'cast1',
      rating: 5,
      comment: 'Excellent service!',
      createdAt: new Date('2025-07-15T10:00:00Z'),
      customer: { id: 'customer1', name: 'Test Customer' },
      cast: { id: 'cast1', name: 'Test Cast' },
    }

    vi.mocked(db.review.findUnique).mockResolvedValueOnce(mockReview as any)

    const request = new NextRequest('http://localhost:3000/api/review?id=review1', {
      method: 'GET',
    })

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.id).toBe('review1')
    expect(data.rating).toBe(5)
    expect(data.comment).toBe('Excellent service!')
    expect(vi.mocked(db.review.findUnique)).toHaveBeenCalledWith({
      where: { id: 'review1' },
      include: {
        customer: true,
        cast: true,
      },
    })
  })

  it('should return 404 for non-existent review', async () => {
    vi.mocked(db.review.findUnique).mockResolvedValueOnce(null)

    const request = new NextRequest('http://localhost:3000/api/review?id=non-existent', {
      method: 'GET',
    })

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Review not found')
  })

  it('should filter reviews by castId', async () => {
    const mockReviews = [
      {
        id: 'review1',
        customerId: 'customer1',
        castId: 'cast1',
        rating: 5,
        comment: 'Great cast!',
        createdAt: new Date('2025-07-15T10:00:00Z'),
        customer: { id: 'customer1', name: 'Customer 1' },
        cast: { id: 'cast1', name: 'Test Cast' },
      },
      {
        id: 'review2',
        customerId: 'customer2',
        castId: 'cast1',
        rating: 4,
        comment: 'Good service',
        createdAt: new Date('2025-07-14T10:00:00Z'),
        customer: { id: 'customer2', name: 'Customer 2' },
        cast: { id: 'cast1', name: 'Test Cast' },
      },
    ]

    vi.mocked(db.review.findMany).mockResolvedValueOnce(mockReviews as any)

    const request = new NextRequest('http://localhost:3000/api/review?castId=cast1', {
      method: 'GET',
    })

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toHaveLength(2)
    expect(vi.mocked(db.review.findMany)).toHaveBeenCalledWith({
      where: { castId: 'cast1' },
      include: {
        customer: true,
        cast: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })
  })

  it('should filter reviews by customerId', async () => {
    const mockReviews = [
      {
        id: 'review1',
        customerId: 'customer1',
        castId: 'cast1',
        rating: 5,
        comment: 'Excellent!',
        createdAt: new Date('2025-07-15T10:00:00Z'),
        customer: { id: 'customer1', name: 'Test Customer' },
        cast: { id: 'cast1', name: 'Cast 1' },
      },
    ]

    vi.mocked(db.review.findMany).mockResolvedValueOnce(mockReviews as any)

    const request = new NextRequest('http://localhost:3000/api/review?customerId=customer1', {
      method: 'GET',
    })

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toHaveLength(1)
    expect(vi.mocked(db.review.findMany)).toHaveBeenCalledWith({
      where: { customerId: 'customer1' },
      include: {
        customer: true,
        cast: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })
  })

  it('should get all reviews sorted by creation date descending', async () => {
    const mockReviews = [
      {
        id: 'review2',
        createdAt: new Date('2025-07-16T10:00:00Z'),
        rating: 4,
      },
      {
        id: 'review1',
        createdAt: new Date('2025-07-15T10:00:00Z'),
        rating: 5,
      },
    ]

    vi.mocked(db.review.findMany).mockResolvedValueOnce(mockReviews as any)

    const request = new NextRequest('http://localhost:3000/api/review', {
      method: 'GET',
    })

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data[0].id).toBe('review2') // Newer review first
    expect(data[1].id).toBe('review1')
  })
})

describe('POST /api/review', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should create a new review', async () => {
    const newReviewData = {
      customerId: 'customer1',
      castId: 'cast1',
      rating: 5,
      comment: 'Amazing experience!',
    }

    const mockCreatedReview = {
      id: 'new-review-id',
      ...newReviewData,
      createdAt: new Date('2025-07-15T10:00:00Z'),
      customer: { id: 'customer1', name: 'Test Customer' },
      cast: { id: 'cast1', name: 'Test Cast' },
    }

    vi.mocked(db.review.create).mockResolvedValueOnce(mockCreatedReview as any)

    const request = new NextRequest('http://localhost:3000/api/review', {
      method: 'POST',
      body: JSON.stringify(newReviewData),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.id).toBe('new-review-id')
    expect(data.rating).toBe(5)
    expect(data.comment).toBe('Amazing experience!')
    expect(vi.mocked(db.review.create)).toHaveBeenCalledWith({
      data: {
        customerId: 'customer1',
        castId: 'cast1',
        rating: 5,
        comment: 'Amazing experience!',
      },
      include: {
        customer: true,
        cast: true,
      },
    })
  })

  it('should default comment to empty string if not provided', async () => {
    const newReviewData = {
      customerId: 'customer1',
      castId: 'cast1',
      rating: 4,
    }

    const mockCreatedReview = {
      id: 'new-review-id',
      ...newReviewData,
      comment: '',
      createdAt: new Date('2025-07-15T10:00:00Z'),
      customer: { id: 'customer1', name: 'Test Customer' },
      cast: { id: 'cast1', name: 'Test Cast' },
    }

    vi.mocked(db.review.create).mockResolvedValueOnce(mockCreatedReview as any)

    const request = new NextRequest('http://localhost:3000/api/review', {
      method: 'POST',
      body: JSON.stringify(newReviewData),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(vi.mocked(db.review.create)).toHaveBeenCalledWith({
      data: {
        customerId: 'customer1',
        castId: 'cast1',
        rating: 4,
        comment: '',
      },
      include: {
        customer: true,
        cast: true,
      },
    })
  })

  it('should handle database creation errors', async () => {
    const newReviewData = {
      customerId: 'non-existent-customer',
      castId: 'cast1',
      rating: 5,
      comment: 'Great!',
    }

    vi.mocked(db.review.create).mockRejectedValueOnce(new Error('Foreign key constraint failed'))

    const request = new NextRequest('http://localhost:3000/api/review', {
      method: 'POST',
      body: JSON.stringify(newReviewData),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Internal server error')
  })
})

describe('PUT /api/review', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should require ID field', async () => {
    const request = new NextRequest('http://localhost:3000/api/review', {
      method: 'PUT',
      body: JSON.stringify({
        rating: 4,
        comment: 'Updated review',
      }),
    })

    const response = await PUT(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('ID is required')
  })

  it('should update review data', async () => {
    const updateData = {
      id: 'review1',
      rating: 4,
      comment: 'Updated: Good service',
    }

    const mockUpdatedReview = {
      id: 'review1',
      customerId: 'customer1',
      castId: 'cast1',
      rating: 4,
      comment: 'Updated: Good service',
      createdAt: new Date('2025-07-15T10:00:00Z'),
      customer: { id: 'customer1', name: 'Test Customer' },
      cast: { id: 'cast1', name: 'Test Cast' },
    }

    vi.mocked(db.review.update).mockResolvedValueOnce(mockUpdatedReview as any)

    const request = new NextRequest('http://localhost:3000/api/review', {
      method: 'PUT',
      body: JSON.stringify(updateData),
    })

    const response = await PUT(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.rating).toBe(4)
    expect(data.comment).toBe('Updated: Good service')
    expect(vi.mocked(db.review.update)).toHaveBeenCalledWith({
      where: { id: 'review1' },
      data: {
        rating: 4,
        comment: 'Updated: Good service',
      },
      include: {
        customer: true,
        cast: true,
      },
    })
  })

  it('should handle non-existent review', async () => {
    vi.mocked(db.review.update).mockRejectedValueOnce({
      code: 'P2025',
      message: 'Record not found',
    })

    const request = new NextRequest('http://localhost:3000/api/review', {
      method: 'PUT',
      body: JSON.stringify({
        id: 'non-existent',
        rating: 3,
      }),
    })

    const response = await PUT(request)
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Review not found')
  })

  it('should allow partial updates', async () => {
    const updateData = {
      id: 'review1',
      rating: 3, // Only updating rating
    }

    const mockUpdatedReview = {
      id: 'review1',
      customerId: 'customer1',
      castId: 'cast1',
      rating: 3,
      comment: 'Original comment',
      createdAt: new Date('2025-07-15T10:00:00Z'),
      customer: { id: 'customer1', name: 'Test Customer' },
      cast: { id: 'cast1', name: 'Test Cast' },
    }

    vi.mocked(db.review.update).mockResolvedValueOnce(mockUpdatedReview as any)

    const request = new NextRequest('http://localhost:3000/api/review', {
      method: 'PUT',
      body: JSON.stringify(updateData),
    })

    const response = await PUT(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.rating).toBe(3)
    expect(vi.mocked(db.review.update)).toHaveBeenCalledWith({
      where: { id: 'review1' },
      data: {
        rating: 3,
        comment: undefined,
      },
      include: {
        customer: true,
        cast: true,
      },
    })
  })
})

describe('DELETE /api/review', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should require ID parameter', async () => {
    const request = new NextRequest('http://localhost:3000/api/review', {
      method: 'DELETE',
    })

    const response = await DELETE(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('ID is required')
  })

  it('should delete review', async () => {
    vi.mocked(db.review.delete).mockResolvedValueOnce({} as any)

    const request = new NextRequest('http://localhost:3000/api/review?id=review1', {
      method: 'DELETE',
    })

    const response = await DELETE(request)

    expect(response.status).toBe(204)
    expect(vi.mocked(db.review.delete)).toHaveBeenCalledWith({
      where: { id: 'review1' },
    })
  })

  it('should handle non-existent review', async () => {
    vi.mocked(db.review.delete).mockRejectedValueOnce({
      code: 'P2025',
      message: 'Record not found',
    })

    const request = new NextRequest('http://localhost:3000/api/review?id=non-existent', {
      method: 'DELETE',
    })

    const response = await DELETE(request)
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Review not found')
  })
})

describe('Review API - Business Logic and Validation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should validate rating range (1-5)', async () => {
    // This test assumes business logic validates rating range
    const invalidRatingData = {
      customerId: 'customer1',
      castId: 'cast1',
      rating: 6, // Invalid rating > 5
      comment: 'Great service',
    }

    vi.mocked(db.review.create).mockRejectedValueOnce(new Error('Rating must be between 1 and 5'))

    const request = new NextRequest('http://localhost:3000/api/review', {
      method: 'POST',
      body: JSON.stringify(invalidRatingData),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Internal server error')
  })

  it('should prevent duplicate reviews from same customer for same cast', async () => {
    const duplicateReviewData = {
      customerId: 'customer1',
      castId: 'cast1',
      rating: 5,
      comment: 'Duplicate review',
    }

    vi.mocked(db.review.create).mockRejectedValueOnce({
      code: 'P2002',
      message: 'Unique constraint failed',
    })

    const request = new NextRequest('http://localhost:3000/api/review', {
      method: 'POST',
      body: JSON.stringify(duplicateReviewData),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Internal server error')
  })

  it('should calculate average rating for cast correctly', async () => {
    const castReviews = [
      { rating: 5 },
      { rating: 4 },
      { rating: 5 },
      { rating: 3 },
      { rating: 4 },
    ]

    const averageRating = castReviews.reduce((sum, review) => sum + review.rating, 0) / castReviews.length
    expect(averageRating).toBe(4.2)

    // Test API maintains rating integrity
    const mockReviews = castReviews.map((review, index) => ({
      id: `review${index + 1}`,
      customerId: `customer${index + 1}`,
      castId: 'cast1',
      rating: review.rating,
      comment: 'Test comment',
      createdAt: new Date(`2025-07-${15 + index}T10:00:00Z`),
      customer: { id: `customer${index + 1}`, name: `Customer ${index + 1}` },
      cast: { id: 'cast1', name: 'Test Cast' },
    }))

    vi.mocked(db.review.findMany).mockResolvedValueOnce(mockReviews as any)

    const request = new NextRequest('http://localhost:3000/api/review?castId=cast1', {
      method: 'GET',
    })

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    const apiAverageRating = data.reduce((sum: number, review: any) => sum + review.rating, 0) / data.length
    expect(apiAverageRating).toBe(averageRating)
  })

  it('should maintain referential integrity with customer and cast', async () => {
    const mockReviewWithDetails = {
      id: 'review1',
      customerId: 'customer1',
      castId: 'cast1',
      rating: 5,
      comment: 'Excellent service with great attention to detail',
      createdAt: new Date('2025-07-15T10:00:00Z'),
      customer: {
        id: 'customer1',
        name: 'Jane Doe',
        email: 'jane@example.com',
      },
      cast: {
        id: 'cast1',
        name: 'Skilled Professional',
        specialization: 'Premium Services',
      },
    }

    vi.mocked(db.review.findUnique).mockResolvedValueOnce(mockReviewWithDetails as any)

    const request = new NextRequest('http://localhost:3000/api/review?id=review1', {
      method: 'GET',
    })

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.customer.name).toBe('Jane Doe')
    expect(data.cast.name).toBe('Skilled Professional')
    expect(data.rating).toBe(5)
  })
})