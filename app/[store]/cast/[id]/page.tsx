import { notFound } from 'next/navigation'
import { fetchStoreBySlug } from '@/lib/store/public-api'
import { CastDetailContent } from '@/components/cast/cast-detail-content'
import { StoreNavigation } from '@/components/store-navigation'
import { StoreFooter } from '@/components/store-footer'
import { getPublicCastDetail } from '@/lib/store/public-casts'

export default async function CastDetailPage({
  params,
}: {
  params: { store: string; id: string }
}) {
  const { store: storeSlug, id } = params
  const store = await fetchStoreBySlug(storeSlug)

  if (!store) {
    notFound()
  }

  const cast = await getPublicCastDetail(store.id, id)

  if (!cast) {
    notFound()
  }

  return (
    <>
      <StoreNavigation />

      <main className="min-h-screen bg-gray-50">
        <CastDetailContent cast={cast} store={store} />

        <StoreFooter store={store} />
      </main>
    </>
  )
}
