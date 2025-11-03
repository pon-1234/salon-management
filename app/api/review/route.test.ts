/**
 * @design_doc   Tests for Review API endpoints
 * @related_to   review/route.ts, review service layer
 * @known_issues None currently
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST, PUT, DELETE } from './route'
import { getServerSession } from 'next-auth'

const serviceMocks = vi.hoisted(() => ({
  searchReviews: vi.fn(),
  getReviewById: vi.fn(),
  createReview: vi.fn(),
  updateReview: vi.fn(),
  deleteReview: vi.fn(),
  getReviewStatsForStore: vi.fn(),
}))

const mockSearchReviews = serviceMocks.searchReviews
const mockGetReviewById = serviceMocks.getReviewById
const mockCreateReview = serviceMocks.createReview
const mockUpdateReview = serviceMocks.updateReview
const mockDeleteReview = serviceMocks.deleteReview
const mockGetReviewStatsForStore = serviceMocks.getReviewStatsForStore

type ReviewServiceErrorCode =
  | 'RESERVATION_NOT_FOUND'
  | 'REVIEW_NOT_FOUND'
  | 'FORBIDDEN'
  | 'RESERVATION_NOT_COMPLETED'
  | 'REVIEW_ALREADY_EXISTS'
  | 'INVALID_STATUS'

const MockReviewServiceError = vi.hoisted(() =>
  class extends Error {
    code: ReviewServiceErrorCode
    constructor(code: ReviewServiceErrorCode, message: string) {
      super(message)
      this.name = 'ReviewServiceError'
      this.code = code
    }
  }
)

vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}))

vi.mock('@/lib/auth/config', () => ({
  authOptions: {},
}))

vi.mock('@/lib/reviews/service', () => ({
  searchReviews: serviceMocks.searchReviews,
  getReviewById: serviceMocks.getReviewById,
  createReview: serviceMocks.createReview,
  updateReview: serviceMocks.updateReview,
  deleteReview: serviceMocks.deleteReview,
  getReviewStatsForStore: serviceMocks.getReviewStatsForStore,
  ReviewServiceError: MockReviewServiceError,
}))

vi.mock('@/lib/logger', () => ({
  default: {
    error: vi.fn(),
  },
}))

describe('Review API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/review', () => {
    it('returns a single review by id', async () => {
      const review = {
        id: 'review-1',
        customerId: 'customer-1',
        status: 'published',
      }

      mockGetReviewById.mockResolvedValueOnce(review)
      vi.mocked(getServerSession).mockResolvedValueOnce(null)

      const request = new NextRequest('http://localhost:3000/api/review?id=review-1', {
        method: 'GET',
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.id).toBe('review-1')
      expect(mockGetReviewById).toHaveBeenCalledWith('review-1')
    })

    it('filters to published reviews for unauthenticated audience', async () => {
      mockSearchReviews.mockResolvedValueOnce([])
      vi.mocked(getServerSession).mockResolvedValueOnce(null)

      const request = new NextRequest('http://localhost:3000/api/review?storeId=store-1', {
        method: 'GET',
      })

      await GET(request)

      expect(mockSearchReviews).toHaveBeenCalledWith({
        storeId: 'store-1',
        castId: undefined,
        customerId: undefined,
        reservationId: undefined,
        statuses: ['published'],
        limit: undefined,
      })
    })

    it('returns reviews and stats when stats=true', async () => {
      const reviews = [{ id: 'r-1' }]
      const stats = { totalReviews: 1, averageRating: 5, ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 1 }, popularTags: [] }

      mockSearchReviews.mockResolvedValueOnce(reviews)
      mockGetReviewStatsForStore.mockResolvedValueOnce(stats)
      vi.mocked(getServerSession).mockResolvedValueOnce(null)

      const request = new NextRequest('http://localhost:3000/api/review?storeId=store-1&stats=true', {
        method: 'GET',
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.reviews).toEqual(reviews)
      expect(data.stats).toEqual(stats)
      expect(mockGetReviewStatsForStore).toHaveBeenCalledWith('store-1', ['published'])
    })

    it('rejects customer lookup when not owner or admin', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { id: 'customer-1', role: 'customer' },
      } as any)

      const request = new NextRequest('http://localhost:3000/api/review?customerId=customer-2', {
        method: 'GET',
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Forbidden')
      expect(mockSearchReviews).not.toHaveBeenCalled()
    })
  })

  describe('POST /api/review', () => {
    it('requires authentication', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce(null)

      const request = new NextRequest('http://localhost:3000/api/review', {
        method: 'POST',
        body: JSON.stringify({}),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Authentication required')
    })

    it('creates review for authenticated customer', async () => {
      const review = { id: 'review-123' }

      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { id: 'customer-1', role: 'customer' },
      } as any)
      mockCreateReview.mockResolvedValueOnce(review)

      const request = new NextRequest('http://localhost:3000/api/review', {
        method: 'POST',
        body: JSON.stringify({
          reservationId: 'reservation-1',
          rating: 5,
          comment: '最高でした！',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data).toEqual(review)
      expect(mockCreateReview).toHaveBeenCalledWith({
        reservationId: 'reservation-1',
        rating: 5,
        comment: '最高でした！',
        status: undefined,
        actorId: 'customer-1',
        actorRole: 'customer',
      })
    })

    it('maps service errors to HTTP responses', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { id: 'customer-1', role: 'customer' },
      } as any)

      mockCreateReview.mockRejectedValueOnce(
        new MockReviewServiceError('RESERVATION_NOT_COMPLETED', 'Reservation not completed')
      )

      const request = new NextRequest('http://localhost:3000/api/review', {
        method: 'POST',
        body: JSON.stringify({
          reservationId: 'reservation-1',
          rating: 5,
          comment: 'Great',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('施術完了後のみ投稿できます')
    })
  })

  describe('PUT /api/review', () => {
    it('updates review with owner session', async () => {
      const updatedReview = { id: 'review-1', rating: 4 }

      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { id: 'customer-1', role: 'customer' },
      } as any)
      mockUpdateReview.mockResolvedValueOnce(updatedReview)

      const request = new NextRequest('http://localhost:3000/api/review', {
        method: 'PUT',
        body: JSON.stringify({
          id: 'review-1',
          rating: 4,
        }),
      })

      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual(updatedReview)
      expect(mockUpdateReview).toHaveBeenCalledWith({
        id: 'review-1',
        rating: 4,
        comment: undefined,
        status: undefined,
        actorId: 'customer-1',
        actorRole: 'customer',
      })
    })

    it('returns service error mapping', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { id: 'customer-1', role: 'customer' },
      } as any)

      mockUpdateReview.mockRejectedValueOnce(
        new MockReviewServiceError('FORBIDDEN', 'Cannot update review')
      )

      const request = new NextRequest('http://localhost:3000/api/review', {
        method: 'PUT',
        body: JSON.stringify({
          id: 'review-1',
          rating: 5,
        }),
      })

      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('操作する権限がありません')
    })
  })

  describe('DELETE /api/review', () => {
    it('deletes review for admin user', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { id: 'admin-1', role: 'admin' },
      } as any)
      mockDeleteReview.mockResolvedValueOnce(undefined)

      const request = new NextRequest('http://localhost:3000/api/review?id=review-1', {
        method: 'DELETE',
      })

      const response = await DELETE(request)

      expect(response.status).toBe(204)
      expect(mockDeleteReview).toHaveBeenCalledWith({
        id: 'review-1',
        actorId: 'admin-1',
        actorRole: 'admin',
      })
    })

    it('maps delete errors appropriately', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { id: 'admin-1', role: 'admin' },
      } as any)
      mockDeleteReview.mockRejectedValueOnce(
        new MockReviewServiceError('REVIEW_NOT_FOUND', 'Missing review')
      )

      const request = new NextRequest('http://localhost:3000/api/review?id=review-404', {
        method: 'DELETE',
      })

      const response = await DELETE(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('口コミが見つかりませんでした')
    })
  })
})
