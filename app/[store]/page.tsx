import { notFound } from 'next/navigation'
import { getStoreBySlug } from '@/lib/store/data'
import { StoreHomeClient } from '@/components/store-home-client'

export default async function StoreHomePage({ 
  params 
}: { 
  params: Promise<{ store: string }> 
}) {
  const { store: storeSlug } = await params
  const store = getStoreBySlug(storeSlug)

  if (!store) {
    notFound()
  }

  return <StoreHomeClient store={store} />
}