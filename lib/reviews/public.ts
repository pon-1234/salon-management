/**
 * @design_doc   Public review data minimization boundary
 * @related_to   Review API and public review page
 * @known_issues None currently
 */
import type { PublicReview, Review } from './types'

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
