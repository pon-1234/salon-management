import type { Review, ReviewStats } from './types'

export function calculateReviewStats(reviews: Review[]): ReviewStats {
  const distribution = {
    5: 0,
    4: 0,
    3: 0,
    2: 0,
    1: 0,
  }

  let totalRating = 0
  const tagCounts: Record<string, number> = {}

  reviews.forEach((review) => {
    const rating = Math.round(review.rating) as keyof typeof distribution
    if (distribution[rating] !== undefined) {
      distribution[rating] += 1
    }
    totalRating += review.rating

    review.tags?.forEach((tag) => {
      tagCounts[tag] = (tagCounts[tag] ?? 0) + 1
    })
  })

  const popularTags = Object.entries(tagCounts)
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  const totalReviews = reviews.length
  const averageRating = totalReviews > 0 ? totalRating / totalReviews : 0

  return {
    totalReviews,
    averageRating,
    ratingDistribution: distribution,
    popularTags,
  }
}
