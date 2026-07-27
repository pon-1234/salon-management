/**
 * @design_doc   Review multi-store isolation contract
 * @related_to   Review service and Review API
 * @known_issues None currently
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '@/lib/db'
import {
  createReview,
  deleteReview,
  getEligibleReservationsForCustomer,
  getReviewById,
  ReviewServiceError,
  updateReview,
  searchReviews,
} from './service'

vi.mock('@/lib/db', () => ({
  db: {
    reservation: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    review: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}))

describe('Review service store isolation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('applies a bounded offset to review list queries', async () => {
    vi.mocked(db.review.findMany).mockResolvedValueOnce([])

    await searchReviews({ storeId: 'store-1', limit: 26, offset: 25 })

    expect(db.review.findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 26, skip: 25 }))
  })

  it('scopes review ID lookup to the requested store', async () => {
    vi.mocked(db.review.findFirst).mockResolvedValueOnce(null)

    await expect(getReviewById('review-1', 'store-1')).resolves.toBeNull()

    expect(db.review.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'review-1',
        cast: { storeId: 'store-1' },
        OR: [{ reservationId: null }, { reservation: { is: { storeId: 'store-1' } } }],
      },
      include: expect.anything(),
    })
  })

  it('scopes the reservation used to create a review to the requested store', async () => {
    vi.mocked(db.reservation.findFirst).mockResolvedValueOnce(null)

    await expect(
      createReview({
        storeId: 'store-1',
        reservationId: 'reservation-1',
        rating: 5,
        comment: 'Great',
        actorId: 'customer-1',
        actorRole: 'customer',
      })
    ).rejects.toMatchObject({ code: 'RESERVATION_NOT_FOUND' } satisfies Partial<ReviewServiceError>)

    expect(db.reservation.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'reservation-1',
        storeId: 'store-1',
        cast: { storeId: 'store-1' },
      },
      include: expect.anything(),
    })
  })

  it('scopes a review update lookup to the requested store', async () => {
    vi.mocked(db.review.findFirst).mockResolvedValueOnce(null)

    await expect(
      updateReview({
        id: 'review-1',
        storeId: 'store-1',
        rating: 4,
        actorId: 'customer-1',
        actorRole: 'customer',
      })
    ).rejects.toMatchObject({ code: 'REVIEW_NOT_FOUND' } satisfies Partial<ReviewServiceError>)

    expect(db.review.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'review-1',
        cast: { storeId: 'store-1' },
        OR: [{ reservationId: null }, { reservation: { is: { storeId: 'store-1' } } }],
      },
      include: expect.anything(),
    })
  })

  it('scopes a review deletion lookup to the requested store', async () => {
    vi.mocked(db.review.findFirst).mockResolvedValueOnce(null)

    await expect(
      deleteReview({
        id: 'review-1',
        storeId: 'store-1',
        actorId: 'admin-1',
        actorRole: 'admin',
      })
    ).rejects.toMatchObject({ code: 'REVIEW_NOT_FOUND' } satisfies Partial<ReviewServiceError>)

    expect(db.review.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'review-1',
        cast: { storeId: 'store-1' },
        OR: [{ reservationId: null }, { reservation: { is: { storeId: 'store-1' } } }],
      },
    })
  })

  it('scopes eligible reservations and their casts to the requested store', async () => {
    vi.mocked(db.reservation.findMany).mockResolvedValueOnce([])

    await expect(getEligibleReservationsForCustomer('customer-1', 'store-1')).resolves.toEqual([])

    expect(db.reservation.findMany).toHaveBeenCalledWith({
      where: {
        customerId: 'customer-1',
        storeId: 'store-1',
        cast: { storeId: 'store-1' },
        status: 'completed',
        reviews: {
          none: {
            customerId: 'customer-1',
          },
        },
      },
      include: expect.anything(),
      orderBy: {
        startTime: 'desc',
      },
    })
  })
})
