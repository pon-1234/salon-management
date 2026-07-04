/**
 * @design_doc   ui-improvement-instructions.md U-12 metadata
 * @related_to   StoreLayout: store-specific title template; ReviewsContent: public review surface
 * @known_issues Cast-filtered review pages share the same title
 */
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { fetchStoreBySlug } from '@/lib/store/public-api'
import { ReviewsContent } from '@/components/reviews/reviews-content'
import { getStoreReviews, getReviewStatsForStore } from '@/lib/reviews/service'
import { getPublicCastDetail } from '@/lib/store/public-casts'

export const metadata: Metadata = {
  title: 'クチコミ',
}

interface ReviewsPageProps {
  params: Promise<{ store: string }>
  searchParams?: Promise<{ castId?: string | string[] }>
}

export default async function ReviewsPage({ params, searchParams }: ReviewsPageProps) {
  const { store: storeSlug } = await params
  const resolvedSearchParams = (await searchParams) ?? {}
  const castId =
    typeof resolvedSearchParams.castId === 'string' && resolvedSearchParams.castId.trim().length > 0
      ? resolvedSearchParams.castId
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
      castFilter={
        cast ? { id: cast.id, name: cast.name } : castId ? { id: castId, name: '' } : undefined
      }
    />
  )
}
