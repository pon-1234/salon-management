/**
 * @design_doc   ui-improvement-instructions.md U-12 metadata
 * @related_to   StoreLayout: store-specific title template; StoreHomeClient: storefront body
 * @known_issues Store-specific default title is generated in the parent layout
 */
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { fetchPublicStoreHomeData } from '@/lib/store/public-api'
import { StoreHomeClient } from '@/components/store-home-client'

export const metadata: Metadata = {
  title: '店舗トップ',
}

export default async function StoreHomePage({ params }: { params: Promise<{ store: string }> }) {
  const { store: storeSlug } = await params
  const data = await fetchPublicStoreHomeData(storeSlug)
  const store = data?.store

  if (!store) {
    notFound()
  }

  return <StoreHomeClient store={store} initialData={data} />
}
