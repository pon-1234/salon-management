import { notFound } from 'next/navigation'
import { fetchStoreBySlug } from '@/lib/store/public-api'
import { ReviewsContent } from '@/components/reviews/reviews-content'
import { getStoreReviews, getReviewStatsForStore } from '@/lib/reviews/service'

export default async function ReviewsPage({ params }: { params: { store: string } }) {
  const { store: storeSlug } = params
  const store = await fetchStoreBySlug(storeSlug)

  if (!store) {
    notFound()
  }

  const [reviews, stats] = await Promise.all([
    getStoreReviews(store.id, { statuses: ['published'] }),
    getReviewStatsForStore(store.id, ['published']),
  ])

  return <ReviewsContent store={store} initialReviews={reviews} initialStats={stats} />
}
