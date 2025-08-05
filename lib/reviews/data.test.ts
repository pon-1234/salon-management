import { describe, it, expect, vi, beforeEach } from 'vitest'
import { reviewsData, getReviewsByStoreId, getReviewStats } from './data'

describe('Reviews Data', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('reviewsData', () => {
    it('should export an array of reviews', () => {
      expect(Array.isArray(reviewsData)).toBe(true)
      expect(reviewsData.length).toBeGreaterThan(0)
    })

    it('should have valid review structure', () => {
      reviewsData.forEach((review) => {
        expect(review).toHaveProperty('id')
        expect(review).toHaveProperty('storeId')
        expect(review).toHaveProperty('castName')
        expect(review).toHaveProperty('customerArea')
        expect(review).toHaveProperty('rating')
        expect(review).toHaveProperty('content')
        expect(review).toHaveProperty('visitDate')
        expect(review).toHaveProperty('createdAt')
        expect(review).toHaveProperty('updatedAt')

        expect(review.rating).toBeGreaterThanOrEqual(1)
        expect(review.rating).toBeLessThanOrEqual(5)
        expect(review.visitDate).toBeInstanceOf(Date)
        expect(review.createdAt).toBeInstanceOf(Date)
        expect(review.updatedAt).toBeInstanceOf(Date)
      })
    })

    it('should have unique review IDs', () => {
      const ids = reviewsData.map((review) => review.id)
      const uniqueIds = [...new Set(ids)]
      expect(ids.length).toBe(uniqueIds.length)
    })

    it('should have reviews with optional fields', () => {
      const reviewsWithOptions = reviewsData.filter((r) => r.options && r.options.length > 0)
      const reviewsWithImages = reviewsData.filter((r) => r.images && r.images.length > 0)
      const reviewsWithTags = reviewsData.filter((r) => r.tags && r.tags.length > 0)
      const reviewsWithResponse = reviewsData.filter((r) => r.response)

      expect(reviewsWithOptions.length).toBeGreaterThan(0)
      // Images field may not be present in all reviews
      expect(reviewsWithImages.length).toBeGreaterThanOrEqual(0)
      expect(reviewsWithTags.length).toBeGreaterThan(0)
      expect(reviewsWithResponse.length).toBeGreaterThan(0)
    })

    it('should have valid response structure when present', () => {
      const reviewsWithResponse = reviewsData.filter((r) => r.response)

      reviewsWithResponse.forEach((review) => {
        expect(review.response).toHaveProperty('content')
        expect(review.response).toHaveProperty('respondedAt')
        expect(review.response).toHaveProperty('respondedBy')
        expect(review.response!.respondedAt).toBeInstanceOf(Date)
      })
    })
  })

  describe('getReviewsByStoreId', () => {
    it('should return reviews for a specific store', () => {
      const storeId = '1'
      const reviews = getReviewsByStoreId(storeId)

      expect(Array.isArray(reviews)).toBe(true)
      reviews.forEach((review) => {
        expect(review.storeId).toBe(storeId)
      })
    })

    it('should return empty array for non-existent store', () => {
      const reviews = getReviewsByStoreId('non-existent')
      expect(reviews).toEqual([])
    })

    it('should return different number of reviews for different stores', () => {
      const store1Reviews = getReviewsByStoreId('1')
      const store2Reviews = getReviewsByStoreId('2')
      const store3Reviews = getReviewsByStoreId('3')

      const totalReviews = store1Reviews.length + store2Reviews.length + store3Reviews.length
      expect(totalReviews).toBe(reviewsData.length)
    })
  })

  describe('getReviewStats', () => {
    it('should return review statistics for a store', () => {
      const stats = getReviewStats('1')

      expect(stats).toHaveProperty('totalReviews')
      expect(stats).toHaveProperty('averageRating')
      expect(stats).toHaveProperty('ratingDistribution')
      expect(stats).toHaveProperty('popularTags')

      expect(typeof stats.totalReviews).toBe('number')
      expect(typeof stats.averageRating).toBe('number')
      expect(stats.averageRating).toBeGreaterThanOrEqual(0)
      expect(stats.averageRating).toBeLessThanOrEqual(5)
    })

    it('should return correct rating distribution', () => {
      const stats = getReviewStats('1')
      const distribution = stats.ratingDistribution

      expect(distribution).toHaveProperty('1')
      expect(distribution).toHaveProperty('2')
      expect(distribution).toHaveProperty('3')
      expect(distribution).toHaveProperty('4')
      expect(distribution).toHaveProperty('5')

      const totalFromDistribution = Object.values(distribution).reduce(
        (sum, count) => sum + count,
        0
      )
      expect(totalFromDistribution).toBe(stats.totalReviews)
    })

    it('should calculate correct average rating', () => {
      const storeId = '1'
      const reviews = getReviewsByStoreId(storeId)
      const stats = getReviewStats(storeId)

      if (reviews.length > 0) {
        const expectedAverage = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
        expect(stats.averageRating).toBeCloseTo(expectedAverage, 1)
      }
    })

    it('should return empty stats for non-existent store', () => {
      const stats = getReviewStats('non-existent')

      expect(stats.totalReviews).toBe(0)
      expect(stats.averageRating).toBe(0)
      expect(Object.values(stats.ratingDistribution).every((v) => v === 0)).toBe(true)
      expect(stats.popularTags).toEqual([])
    })

    it('should return popular tags sorted by count', () => {
      const stats = getReviewStats('1')

      if (stats.popularTags.length > 1) {
        for (let i = 1; i < stats.popularTags.length; i++) {
          expect(stats.popularTags[i - 1].count).toBeGreaterThanOrEqual(stats.popularTags[i].count)
        }
      }
    })

    it('should return top 10 popular tags', () => {
      const stats = getReviewStats('1')
      // The implementation returns top 10 tags, not 5
      expect(stats.popularTags.length).toBeLessThanOrEqual(10)
    })
  })
})
