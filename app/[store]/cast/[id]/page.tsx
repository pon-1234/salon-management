/**
 * @design_doc   ui-improvement-instructions.md U-14 cast detail dialog accessibility
 * @related_to   CastDetailContent: renders profile and image dialog
 * @known_issues Store-specific cast detail metadata is not yet generated
 */
import { notFound } from 'next/navigation'
import { fetchStoreBySlug } from '@/lib/store/public-api'
import { CastDetailContent } from '@/components/cast/cast-detail-content'
import { StoreNavigation } from '@/components/store-navigation'
import { StoreFooter } from '@/components/store-footer'
import { getPublicCastDetail } from '@/lib/store/public-casts'

export default async function CastDetailPage({
  params,
}: {
  params: Promise<{ store: string; id: string }>
}) {
  const { store: storeSlug, id } = await params
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

      <main className="min-h-screen bg-[#0b0b0b] text-foreground">
        <CastDetailContent cast={cast} store={store} />

        <StoreFooter store={store} />
      </main>
    </>
  )
}
