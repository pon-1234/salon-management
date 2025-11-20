import { notFound } from 'next/navigation'
import { fetchStoreBySlug } from '@/lib/store/public-api'
import { StoreProvider } from '@/components/store-provider'

export default async function StoreLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: { store: string }
}) {
  const { store: storeSlug } = params
  const store = await fetchStoreBySlug(storeSlug)

  if (!store) {
    notFound()
  }

  return (
    <StoreProvider store={store}>
      <div
        style={
          {
            '--primary-color': store.theme?.primaryColor,
            '--secondary-color': store.theme?.secondaryColor,
          } as React.CSSProperties
        }
      >
        {children}
      </div>
    </StoreProvider>
  )
}
