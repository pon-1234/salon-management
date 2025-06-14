import { notFound } from 'next/navigation'
import { getStoreBySlug } from '@/lib/store/data'
import { StoreProvider } from '@/components/store-provider'

export default function StoreLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: { store: string }
}) {
  const store = getStoreBySlug(params.store)

  if (!store) {
    notFound()
  }

  return (
    <StoreProvider store={store}>
      <div style={{ '--primary-color': store.theme?.primaryColor, '--secondary-color': store.theme?.secondaryColor } as React.CSSProperties}>
        {children}
      </div>
    </StoreProvider>
  )
}