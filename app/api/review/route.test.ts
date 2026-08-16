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

const storeServerMocks = vi.hoisted(() => ({
  ensureStoreId: vi.fn(),
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

const MockReviewServiceError = vi.hoisted(
  () =>
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

vi.mock('@/lib/store/server', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/store/server')>()
  return {
    ...actual,
    ensureStoreId: storeServerMocks.ensureStoreId,
  }
})

vi.mock('@/lib/logger', () => ({
  default: {
    error: vi.fn(),
  },
}))

describe('Review API', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    storeServerMocks.ensureStoreId.mockImplementation((storeId: string) => Promise.resolve(storeId))
  })

  describe('GET /api/review', () => {
    it('returns a single review by id', async () => {
      const review = {
        id: 'review-1',
        storeId: 'store-1',
        reservationId: 'reservation-1',
        customerId: 'customer-1',
        customerName: '山田 花子',
        customerAlias: '山***',
        status: 'published',
      }

      mockGetReviewById.mockResolvedValueOnce(review)
      vi.mocked(getServerSession).mockResolvedValueOnce(null)

      const request = new NextRequest(
        'http://localhost:3000/api/review?id=review-1&storeId=store-1',
        {
          method: 'GET',
        }
      )

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.id).toBe('review-1')
      expect(data.customerAlias).toBe('山***')
      expect(data).not.toHaveProperty('customerId')
      expect(data).not.toHaveProperty('customerName')
      expect(data).not.toHaveProperty('reservationId')
      expect(mockGetReviewById).toHaveBeenCalledWith('review-1', 'store-1')
    })

    it('requires storeId when fetching a review by id', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce(null)

      const request = new NextRequest('http://localhost:3000/api/review?id=review-1', {
        method: 'GET',
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('storeId is required')
      expect(mockGetReviewById).not.toHaveBeenCalled()
    })

    it('requires storeId when listing public reviews', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce(null)

      const response = await GET(new NextRequest('http://localhost:3000/api/review'))

      expect(response.status).toBe(400)
      expect((await response.json()).error).toBe('storeId is required')
      expect(mockSearchReviews).not.toHaveBeenCalled()
      expect(mockGetReviewStatsForStore).not.toHaveBeenCalled()
    })

    it('returns 404 instead of 500 when the production hostname resolves to an unknown store', async () => {
      storeServerMocks.ensureStoreId.mockRejectedValueOnce(new Error('Unknown store: salon'))
      vi.mocked(getServerSession).mockResolvedValueOnce(null)

      const response = await GET(
        new NextRequest('https://salon.c-platinum.com/api/review', { method: 'GET' })
      )

      expect(response.status).toBe(404)
      expect(await response.json()).toEqual({ error: 'Unknown store' })
      expect(mockSearchReviews).not.toHaveBeenCalled()
      expect(mockGetReviewById).not.toHaveBeenCalled()
    })

    it('keeps identity fields for the customer who owns the review', async () => {
      const review = {
        id: 'review-1',
        storeId: 'store-1',
        reservationId: 'reservation-1',
        customerId: 'customer-1',
        customerName: '山田 花子',
        customerAlias: '山***',
        status: 'published',
      }

      mockGetReviewById.mockResolvedValueOnce(review)
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { id: 'customer-1', role: 'customer' },
      } as any)

      const response = await GET(
        new NextRequest('http://localhost:3000/api/review?id=review-1&storeId=store-1')
      )

      expect(await response.json()).toEqual(review)
    })

    it('rejects an admin who is not assigned to the requested store', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: {
          id: 'admin-1',
          role: 'admin',
          permissions: ['customer:read'],
          storeIds: ['store-2'],
        },
      } as any)

      const response = await GET(
        new NextRequest('http://localhost:3000/api/review?storeId=store-1&status=all')
      )

      expect(response.status).toBe(403)
      expect(mockSearchReviews).not.toHaveBeenCalled()
    })

    it('rejects an assigned admin without customer:read before loading review data', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { id: 'admin-1', role: 'admin', permissions: [], storeIds: ['store-1'] },
      } as any)

      const response = await GET(
        new NextRequest('http://localhost:3000/api/review?storeId=store-1&status=all')
      )

      expect(response.status).toBe(403)
      expect(mockSearchReviews).not.toHaveBeenCalled()
      expect(mockGetReviewById).not.toHaveBeenCalled()
    })

    it('canonicalizes a store slug before admin access and list service calls', async () => {
      const stats = {
        totalReviews: 0,
        averageRating: 0,
        ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        popularTags: [],
      }
      storeServerMocks.ensureStoreId.mockResolvedValueOnce('uat-ikebukuro')
      mockSearchReviews.mockResolvedValueOnce([])
      mockGetReviewStatsForStore.mockResolvedValueOnce(stats)
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: {
          id: 'admin-1',
          role: 'admin',
          adminRole: 'manager',
          permissions: ['customer:read'],
          storeIds: ['uat-ikebukuro'],
        },
      } as any)

      const response = await GET(
        new NextRequest('http://localhost:3000/api/review?store=ikebukuro&stats=true&status=all')
      )

      expect(response.status).toBe(200)
      expect(storeServerMocks.ensureStoreId).toHaveBeenCalledWith('ikebukuro')
      expect(mockSearchReviews).toHaveBeenCalledWith(
        expect.objectContaining({ storeId: 'uat-ikebukuro' })
      )
      expect(mockGetReviewStatsForStore).toHaveBeenCalledWith('uat-ikebukuro', undefined)
    })

    it('canonicalizes a store slug before fetching a review by id', async () => {
      storeServerMocks.ensureStoreId.mockResolvedValueOnce('uat-ikebukuro')
      mockGetReviewById.mockResolvedValueOnce({
        id: 'review-1',
        storeId: 'uat-ikebukuro',
        reservationId: 'reservation-1',
        customerId: 'customer-1',
        customerName: '山田 花子',
        customerAlias: '山***',
        status: 'published',
      })
      vi.mocked(getServerSession).mockResolvedValueOnce(null)

      const response = await GET(
        new NextRequest('http://localhost:3000/api/review?id=review-1&storeId=ikebukuro')
      )

      expect(response.status).toBe(200)
      expect(storeServerMocks.ensureStoreId).toHaveBeenCalledWith('ikebukuro')
      expect(mockGetReviewById).toHaveBeenCalledWith('review-1', 'uat-ikebukuro')
    })

    it('filters to published reviews for unauthenticated audience', async () => {
      mockSearchReviews.mockResolvedValueOnce([
        {
          id: 'review-1',
          customerId: 'customer-1',
          customerName: '山田 花子',
          customerAlias: '山***',
          reservationId: 'reservation-1',
          status: 'published',
        },
      ])
      vi.mocked(getServerSession).mockResolvedValueOnce(null)

      const request = new NextRequest('http://localhost:3000/api/review?storeId=store-1', {
        method: 'GET',
      })

      const response = await GET(request)
      const data = await response.json()

      expect(mockSearchReviews).toHaveBeenCalledWith({
        storeId: 'store-1',
        castId: undefined,
        customerId: undefined,
        reservationId: undefined,
        statuses: ['published'],
        limit: 25,
        offset: 0,
      })
      expect(data[0].customerAlias).toBe('山***')
      expect(data[0]).not.toHaveProperty('customerId')
      expect(data[0]).not.toHaveProperty('customerName')
      expect(data[0]).not.toHaveProperty('reservationId')
    })

    it('passes validated pagination to the review service', async () => {
      mockSearchReviews.mockResolvedValueOnce([])
      vi.mocked(getServerSession).mockResolvedValueOnce(null)

      const response = await GET(
        new NextRequest('http://localhost:3000/api/review?storeId=store-1&limit=26&offset=25')
      )

      expect(response.status).toBe(200)
      expect(mockSearchReviews).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 26, offset: 25 })
      )
    })

    it('returns reviews and stats when stats=true', async () => {
      const reviews = [{ id: 'r-1' }]
      const stats = {
        totalReviews: 1,
        averageRating: 5,
        ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 1 },
        popularTags: [],
      }

      mockSearchReviews.mockResolvedValueOnce(reviews)
      mockGetReviewStatsForStore.mockResolvedValueOnce(stats)
      vi.mocked(getServerSession).mockResolvedValueOnce(null)

      const request = new NextRequest(
        'http://localhost:3000/api/review?storeId=store-1&stats=true',
        {
          method: 'GET',
        }
      )

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

      const request = new NextRequest(
        'http://localhost:3000/api/review?storeId=store-1&customerId=customer-2',
        {
          method: 'GET',
        }
      )

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

      const request = new NextRequest('http://localhost:3000/api/review?storeId=store-1', {
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

      const request = new NextRequest('http://localhost:3000/api/review?storeId=store-1', {
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
        storeId: 'store-1',
        reservationId: 'reservation-1',
        rating: 5,
        comment: '最高でした！',
        status: undefined,
        actorId: 'customer-1',
        actorRole: 'customer',
      })
    })

    it('canonicalizes a store slug before admin access and review creation', async () => {
      storeServerMocks.ensureStoreId.mockResolvedValueOnce('uat-ikebukuro')
      mockCreateReview.mockResolvedValueOnce({ id: 'review-123' })
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: {
          id: 'admin-1',
          role: 'admin',
          adminRole: 'manager',
          permissions: ['customer:update'],
          storeIds: ['uat-ikebukuro'],
        },
      } as any)

      const response = await POST(
        new NextRequest('http://localhost:3000/api/review', {
          method: 'POST',
          headers: { 'x-store-id': 'ikebukuro' },
          body: JSON.stringify({
            reservationId: 'reservation-1',
            rating: 5,
            comment: 'Great',
          }),
        })
      )

      expect(response.status).toBe(201)
      expect(storeServerMocks.ensureStoreId).toHaveBeenCalledWith('ikebukuro')
      expect(mockCreateReview).toHaveBeenCalledWith(
        expect.objectContaining({ storeId: 'uat-ikebukuro', actorRole: 'admin' })
      )
    })

    it('rejects an assigned admin without review moderation permission before creation', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: {
          id: 'admin-1',
          role: 'admin',
          adminRole: 'manager',
          permissions: ['customer:read'],
          storeIds: ['store-1'],
        },
      } as any)

      const response = await POST(
        new NextRequest('http://localhost:3000/api/review?storeId=store-1', {
          method: 'POST',
          body: JSON.stringify({
            reservationId: 'reservation-1',
            rating: 5,
            comment: 'Great',
          }),
        })
      )

      expect(response.status).toBe(403)
      expect(mockCreateReview).not.toHaveBeenCalled()
    })

    it('requires storeId before creating a review', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { id: 'customer-1', role: 'customer' },
      } as any)

      const response = await POST(
        new NextRequest('http://localhost:3000/api/review', {
          method: 'POST',
          body: JSON.stringify({
            reservationId: 'reservation-1',
            rating: 5,
            comment: 'Great',
          }),
        })
      )

      expect(response.status).toBe(400)
      expect(mockCreateReview).not.toHaveBeenCalled()
    })

    it('maps service errors to HTTP responses', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { id: 'customer-1', role: 'customer' },
      } as any)

      mockCreateReview.mockRejectedValueOnce(
        new MockReviewServiceError('RESERVATION_NOT_COMPLETED', 'Reservation not completed')
      )

      const request = new NextRequest('http://localhost:3000/api/review?storeId=store-1', {
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

      const request = new NextRequest('http://localhost:3000/api/review?storeId=store-1', {
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
        storeId: 'store-1',
        rating: 4,
        comment: undefined,
        status: undefined,
        actorId: 'customer-1',
        actorRole: 'customer',
      })
    })

    it('canonicalizes a store slug before admin access and review update', async () => {
      storeServerMocks.ensureStoreId.mockResolvedValueOnce('uat-ikebukuro')
      mockUpdateReview.mockResolvedValueOnce({ id: 'review-1', rating: 4 })
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: {
          id: 'admin-1',
          role: 'admin',
          adminRole: 'manager',
          permissions: ['customer:update'],
          storeIds: ['uat-ikebukuro'],
        },
      } as any)

      const response = await PUT(
        new NextRequest('http://localhost:3000/api/review?store=ikebukuro', {
          method: 'PUT',
          body: JSON.stringify({ id: 'review-1', rating: 4 }),
        })
      )

      expect(response.status).toBe(200)
      expect(storeServerMocks.ensureStoreId).toHaveBeenCalledWith('ikebukuro')
      expect(mockUpdateReview).toHaveBeenCalledWith(
        expect.objectContaining({ storeId: 'uat-ikebukuro', actorRole: 'admin' })
      )
    })

    it('rejects an assigned admin without review moderation permission before update', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: {
          id: 'admin-1',
          role: 'admin',
          adminRole: 'manager',
          permissions: ['customer:read'],
          storeIds: ['store-1'],
        },
      } as any)

      const response = await PUT(
        new NextRequest('http://localhost:3000/api/review?storeId=store-1', {
          method: 'PUT',
          body: JSON.stringify({ id: 'review-1', rating: 4 }),
        })
      )

      expect(response.status).toBe(403)
      expect(mockUpdateReview).not.toHaveBeenCalled()
    })

    it('returns service error mapping', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { id: 'customer-1', role: 'customer' },
      } as any)

      mockUpdateReview.mockRejectedValueOnce(
        new MockReviewServiceError('FORBIDDEN', 'Cannot update review')
      )

      const request = new NextRequest('http://localhost:3000/api/review?storeId=store-1', {
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

    it('requires storeId before updating a review', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { id: 'customer-1', role: 'customer' },
      } as any)

      const response = await PUT(
        new NextRequest('http://localhost:3000/api/review', {
          method: 'PUT',
          body: JSON.stringify({ id: 'review-1', rating: 4 }),
        })
      )

      expect(response.status).toBe(400)
      expect(mockUpdateReview).not.toHaveBeenCalled()
    })
  })

  describe('DELETE /api/review', () => {
    it('deletes review for admin user', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: {
          id: 'admin-1',
          role: 'admin',
          adminRole: 'super_admin',
          permissions: ['customer:update'],
        },
      } as any)
      mockDeleteReview.mockResolvedValueOnce(undefined)

      const request = new NextRequest(
        'http://localhost:3000/api/review?id=review-1&storeId=store-1',
        {
          method: 'DELETE',
        }
      )

      const response = await DELETE(request)

      expect(response.status).toBe(204)
      expect(mockDeleteReview).toHaveBeenCalledWith({
        id: 'review-1',
        storeId: 'store-1',
        actorId: 'admin-1',
        actorRole: 'admin',
      })
    })

    it('canonicalizes a store slug before admin access and review deletion', async () => {
      storeServerMocks.ensureStoreId.mockResolvedValueOnce('uat-ikebukuro')
      mockDeleteReview.mockResolvedValueOnce(undefined)
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: {
          id: 'admin-1',
          role: 'admin',
          adminRole: 'manager',
          permissions: ['customer:update'],
          storeIds: ['uat-ikebukuro'],
        },
      } as any)

      const response = await DELETE(
        new NextRequest('http://localhost:3000/api/review?id=review-1', {
          method: 'DELETE',
          headers: { 'x-store-id': 'ikebukuro' },
        })
      )

      expect(response.status).toBe(204)
      expect(storeServerMocks.ensureStoreId).toHaveBeenCalledWith('ikebukuro')
      expect(mockDeleteReview).toHaveBeenCalledWith(
        expect.objectContaining({ storeId: 'uat-ikebukuro', actorRole: 'admin' })
      )
    })

    it('rejects an assigned admin without review moderation permission before deletion', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: {
          id: 'admin-1',
          role: 'admin',
          adminRole: 'manager',
          permissions: ['customer:read'],
          storeIds: ['store-1'],
        },
      } as any)

      const response = await DELETE(
        new NextRequest('http://localhost:3000/api/review?id=review-1&storeId=store-1', {
          method: 'DELETE',
        })
      )

      expect(response.status).toBe(403)
      expect(mockDeleteReview).not.toHaveBeenCalled()
    })

    it('keeps customer-owned deletion independent of admin moderation permission', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { id: 'customer-1', role: 'customer' },
      } as any)
      mockDeleteReview.mockResolvedValueOnce(undefined)

      const response = await DELETE(
        new NextRequest('http://localhost:3000/api/review?id=review-1&storeId=store-1', {
          method: 'DELETE',
        })
      )

      expect(response.status).toBe(204)
      expect(mockDeleteReview).toHaveBeenCalledWith({
        id: 'review-1',
        storeId: 'store-1',
        actorId: 'customer-1',
        actorRole: 'customer',
      })
    })

    it('maps delete errors appropriately', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: {
          id: 'admin-1',
          role: 'admin',
          adminRole: 'super_admin',
          permissions: ['customer:update'],
        },
      } as any)
      mockDeleteReview.mockRejectedValueOnce(
        new MockReviewServiceError('REVIEW_NOT_FOUND', 'Missing review')
      )

      const request = new NextRequest(
        'http://localhost:3000/api/review?id=review-404&storeId=store-1',
        {
          method: 'DELETE',
        }
      )

      const response = await DELETE(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('口コミが見つかりませんでした')
    })

    it('requires storeId before deleting a review', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: {
          id: 'admin-1',
          role: 'admin',
          adminRole: 'super_admin',
          permissions: ['customer:update'],
        },
      } as any)

      const response = await DELETE(
        new NextRequest('http://localhost:3000/api/review?id=review-1', {
          method: 'DELETE',
        })
      )

      expect(response.status).toBe(400)
      expect(mockDeleteReview).not.toHaveBeenCalled()
    })
  })
})
