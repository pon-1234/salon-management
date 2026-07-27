/**
 * @design_doc   Public review data minimization contract
 * @related_to   Public review page and Review API
 * @known_issues None currently
 */
import { describe, expect, it, vi } from 'vitest'
import type { Review } from './types'
import { getPublicReviewPageData, toPublicReview } from './public'

vi.mock('./service', () => ({
  getStoreReviews: vi.fn().mockRejectedValue(new Error('database unavailable')),
  getReviewStatsForStore: vi.fn().mockRejectedValue(new Error('database unavailable')),
}))

describe('toPublicReview', () => {
  it('keeps display fields but removes customer and reservation identifiers', () => {
    const review: Review = {
      id: 'review-1',
      createdAt: new Date('2026-07-01T00:00:00.000Z'),
      updatedAt: new Date('2026-07-02T00:00:00.000Z'),
      storeId: 'store-1',
      reservationId: 'reservation-1',
      castId: 'cast-1',
      castName: '花子',
      customerId: 'customer-1',
      customerName: '山田 太郎',
      customerAlias: '山***',
      customerArea: '池袋',
      rating: 5,
      comment: 'とても良かったです',
      visitDate: new Date('2026-06-30T00:00:00.000Z'),
      courseName: '60分',
      options: ['オプション'],
      isVerified: true,
      helpful: 1,
      tags: ['丁寧'],
      status: 'published',
      publishedAt: new Date('2026-07-01T00:00:00.000Z'),
    }

    const result = toPublicReview(review)

    expect(result).toMatchObject({
      id: 'review-1',
      castName: '花子',
      customerAlias: '山***',
      rating: 5,
      comment: 'とても良かったです',
    })
    expect(result).not.toHaveProperty('customerId')
    expect(result).not.toHaveProperty('customerName')
    expect(result).not.toHaveProperty('reservationId')
    expect(result).not.toHaveProperty('storeId')
    expect(result).not.toHaveProperty('castId')
    expect(result).not.toHaveProperty('updatedAt')
    expect(result).not.toHaveProperty('publishedAt')
  })
})

describe('getPublicReviewPageData', () => {
  it('returns an empty public review state when persisted reads fail', async () => {
    await expect(getPublicReviewPageData('store-a')).resolves.toEqual({
      reviews: [],
      stats: {
        totalReviews: 0,
        averageRating: 0,
        ratingDistribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
        popularTags: [],
      },
    })
  })
})
