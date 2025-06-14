import { notFound } from 'next/navigation'
import { getStoreBySlug } from '@/lib/store/data'
import { ReviewsContent } from '@/components/reviews/reviews-content'

export default async function ReviewsPage({ 
  params 
}: { 
  params: Promise<{ store: string }> 
}) {
  const { store: storeSlug } = await params
  const store = getStoreBySlug(storeSlug)

  if (!store) {
    notFound()
  }

  return <ReviewsContent store={store} />
}