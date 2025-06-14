import { StoreFooter } from '@/components/store-footer'
import { getStoreBySlug } from '@/lib/store/data'
import { notFound } from 'next/navigation'

export default async function StoreBookingPage({ 
  params 
}: { 
  params: Promise<{ store: string }> 
}) {
  const { store: storeSlug } = await params
  const store = getStoreBySlug(storeSlug)

  if (!store) {
    notFound()
  }

  return (
    <main>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold mb-8">予約ページ</h1>
        <p>店舗別の予約ページです</p>
      </div>
      
      <StoreFooter store={store} />
    </main>
  )
}