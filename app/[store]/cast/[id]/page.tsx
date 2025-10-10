import { notFound } from 'next/navigation'
import { getStoreBySlug } from '@/lib/store/data'
import { CastDetailContent } from '@/components/cast/cast-detail-content'
import { StoreNavigation } from '@/components/store-navigation'
import { StoreFooter } from '@/components/store-footer'
import { Cast } from '@/lib/cast/types'
import { resolveApiUrl } from '@/lib/http/base-url'
import { normalizeCast } from '@/lib/cast/mapper'

export default async function CastDetailPage({
  params,
}: {
  params: Promise<{ store: string; id: string }>
}) {
  const { store: storeSlug, id } = await params
  const store = getStoreBySlug(storeSlug)

  if (!store) {
    notFound()
  }

  let cast: Cast | null = null
  try {
    const response = await fetch(resolveApiUrl(`/api/cast?id=${id}`), {
      cache: 'no-store',
    })
    if (response.status === 404) {
      notFound()
    }
    if (response.ok) {
      const payload = await response.json()
      cast = normalizeCast(payload)
    }
  } catch (error) {
    console.error('Failed to load cast data:', error)
  }

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
