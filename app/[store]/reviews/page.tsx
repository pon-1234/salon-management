import { notFound } from 'next/navigation'
import { fetchStoreBySlug } from '@/lib/store/public-api'
import { ReviewsContent } from '@/components/reviews/reviews-content'
import { getStoreReviews, getReviewStatsForStore } from '@/lib/reviews/service'
import { getPublicCastDetail } from '@/lib/store/public-casts'

interface ReviewsPageProps {
  params: { store: string }
  searchParams?: { castId?: string | string[] }
}

export default async function ReviewsPage({ params, searchParams }: ReviewsPageProps) {
  const { store: storeSlug } = params
  const castId =
    typeof searchParams?.castId === 'string' && searchParams.castId.trim().length > 0
      ? searchParams.castId
      : null

  const store = await fetchStoreBySlug(storeSlug)

  if (!store) {
    notFound()
  }

  const cast = castId ? await getPublicCastDetail(store.id, castId).catch(() => null) : null

  const [reviews, stats] = await Promise.all([
    getStoreReviews(store.id, { statuses: ['published'], castId: cast?.id ?? castId ?? undefined }),
    getReviewStatsForStore(store.id, ['published']),
  ])

  return (
    <ReviewsContent
      store={store}
      initialReviews={reviews}
      initialStats={stats}
      castFilter={cast ? { id: cast.id, name: cast.name } : castId ? { id: castId, name: '' } : undefined}
    />
  )
}
