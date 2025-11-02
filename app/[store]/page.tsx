import { notFound } from 'next/navigation'
import { fetchPublicStoreHomeData } from '@/lib/store/public-api'
import { StoreHomeClient } from '@/components/store-home-client'

export default async function StoreHomePage({ params }: { params: Promise<{ store: string }> }) {
  const { store: storeSlug } = await params
  const data = await fetchPublicStoreHomeData(storeSlug)
  const store = data?.store

  if (!store) {
    notFound()
  }

  return <StoreHomeClient store={store} initialData={data} />
}
