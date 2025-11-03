import { describe, it, expect } from 'vitest'
import { calculateReviewStats } from './utils'
import type { Review } from './types'

function createReview(overrides: Partial<Review> = {}): Review {
  const now = new Date('2025-01-01T12:00:00Z')
  return {
    id: overrides.id ?? 'review-default',
    storeId: overrides.storeId ?? 'store-1',
    reservationId: overrides.reservationId ?? 'reservation-1',
    castId: overrides.castId ?? 'cast-1',
    castName: overrides.castName ?? 'テストキャスト',
    customerId: overrides.customerId ?? 'customer-1',
    customerName: overrides.customerName ?? 'テスト太郎',
    customerAlias: overrides.customerAlias ?? 'テ***',
    customerArea: overrides.customerArea ?? '豊島区',
    rating: overrides.rating ?? 5,
    comment: overrides.comment ?? 'とても丁寧な施術で癒されました。',
    visitDate: overrides.visitDate ?? now,
    courseName: overrides.courseName ?? '90分コース',
    options: overrides.options ?? ['指名'],
    isVerified: overrides.isVerified ?? true,
    helpful: overrides.helpful ?? 0,
    tags: overrides.tags ?? ['丁寧', '癒し'],
    response: overrides.response,
    status: overrides.status ?? 'published',
    publishedAt: overrides.publishedAt ?? now,
    createdAt: overrides.createdAt ?? now,
    updatedAt: overrides.updatedAt ?? now,
  }
}

describe('calculateReviewStats', () => {
  it('computes aggregates for a given review collection', () => {
    const reviews: Review[] = [
      createReview({
        id: 'review-1',
        rating: 5,
        tags: ['丁寧', '接客'],
      }),
      createReview({
        id: 'review-2',
        rating: 4,
      }),
      createReview({
        id: 'review-3',
        rating: 3,
        tags: [],
      }),
    ]

    const stats = calculateReviewStats(reviews)

    expect(stats.totalReviews).toBe(3)
    expect(stats.averageRating).toBeCloseTo((5 + 4 + 3) / 3, 5)
    expect(stats.ratingDistribution[5]).toBe(1)
    expect(stats.ratingDistribution[4]).toBe(1)
    expect(stats.ratingDistribution[3]).toBe(1)
    expect(stats.ratingDistribution[2]).toBe(0)
    expect(stats.ratingDistribution[1]).toBe(0)

    expect(stats.popularTags).toEqual([
      { tag: '丁寧', count: 2 },
      { tag: '接客', count: 1 },
      { tag: '癒し', count: 1 },
    ])
  })

  it('returns zeroed stats when no reviews are provided', () => {
    const stats = calculateReviewStats([])
    expect(stats.totalReviews).toBe(0)
    expect(stats.averageRating).toBe(0)
    expect(Object.values(stats.ratingDistribution).every((value) => value === 0)).toBe(true)
    expect(stats.popularTags).toEqual([])
  })
})
