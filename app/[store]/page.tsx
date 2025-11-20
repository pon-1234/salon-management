import { notFound } from 'next/navigation'
import { fetchPublicStoreHomeData } from '@/lib/store/public-api'
import { StoreHomeClient } from '@/components/store-home-client'

export default async function StoreHomePage({ params }: { params: { store: string } }) {
  const { store: storeSlug } = params
  const data = await fetchPublicStoreHomeData(storeSlug)
  const store = data?.store

  if (!store) {
    notFound()
  }

  return <StoreHomeClient store={store} initialData={data} />
}
