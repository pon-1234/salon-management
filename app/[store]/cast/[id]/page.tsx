import { notFound } from 'next/navigation'
import { getStoreBySlug } from '@/lib/store/data'
import { getCastById } from '@/lib/cast/data'
import { CastDetailContent } from '@/components/cast/cast-detail-content'
import { StoreNavigation } from '@/components/store-navigation'
import { StoreFooter } from '@/components/store-footer'

export default async function CastDetailPage({ 
  params 
}: { 
  params: Promise<{ store: string; id: string }> 
}) {
  const { store: storeSlug, id } = await params
  const store = getStoreBySlug(storeSlug)

  if (!store) {
    notFound()
  }

  // Get cast data
  const cast = getCastById(id)
  
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