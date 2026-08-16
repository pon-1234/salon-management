/**
 * @design_doc   Public review data minimization boundary
 * @related_to   Review API and public review page
 * @known_issues None currently
 */
import { getReviewStatsForStore, getStoreReviews } from './service'
import { toPublicReview } from './public-mapper'
import { calculateReviewStats } from './utils'
import logger from '@/lib/logger'

export { toPublicReview } from './public-mapper'

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
