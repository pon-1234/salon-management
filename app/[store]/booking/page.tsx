import { StoreFooter } from '@/components/store-footer'
import { fetchStoreBySlug } from '@/lib/store/public-api'
import { notFound } from 'next/navigation'

export default async function StoreBookingPage({ params }: { params: Promise<{ store: string }> }) {
  const { store: storeSlug } = await params
  const store = await fetchStoreBySlug(storeSlug)

  if (!store) {
    notFound()
  }

  return (
    <main>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="mb-8 text-3xl font-bold">予約ページ</h1>
        <p>店舗別の予約ページです</p>
      </div>

      <StoreFooter store={store} />
    </main>
  )
}
