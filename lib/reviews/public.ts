/**
 * @design_doc   Public review data minimization boundary
 * @related_to   Review API and public review page
 * @known_issues None currently
 */
import type { PublicReview, Review } from './types'
import { getReviewStatsForStore, getStoreReviews } from './service'
import { calculateReviewStats } from './utils'
import logger from '@/lib/logger'

export function toPublicReview(review: Review): PublicReview {
  return {
    id: review.id,
    createdAt: review.createdAt,
    castName: review.castName,
    customerAlias: review.customerAlias,
    customerArea: review.customerArea,
    rating: review.rating,
    comment: review.comment,
    visitDate: review.visitDate,
    courseName: review.courseName,
    options: review.options,
    isVerified: review.isVerified,
    helpful: review.helpful,
    tags: review.tags,
    response: review.response,
    status: review.status,
  }
}

export async function getPublicReviewPageData(storeId: string, castId?: string) {
  try {
    const [reviews, stats] = await Promise.all([
      getStoreReviews(storeId, { statuses: ['published'], castId }),
      getReviewStatsForStore(storeId, ['published']),
    ])
    return { reviews: reviews.map(toPublicReview), stats }
  } catch (error) {
    logger.error({ err: error, storeId }, 'Failed to load public reviews')
    return { reviews: [], stats: calculateReviewStats([]) }
  }
}
