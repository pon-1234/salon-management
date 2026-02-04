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
        className="luxury-body bg-[#0b0b0b] text-foreground"
        style={
          {
            '--primary-color': store.theme?.primaryColor,
            '--secondary-color': store.theme?.secondaryColor,
            '--background': '0 0% 5%',
            '--foreground': '36 35% 90%',
            '--card': '20 12% 10%',
            '--card-foreground': '36 35% 90%',
            '--popover': '20 12% 10%',
            '--popover-foreground': '36 35% 90%',
            '--primary': '42 70% 72%',
            '--primary-foreground': '30 35% 10%',
            '--secondary': '30 18% 16%',
            '--secondary-foreground': '36 35% 90%',
            '--muted': '30 15% 14%',
            '--muted-foreground': '34 25% 70%',
            '--accent': '32 22% 20%',
            '--accent-foreground': '36 35% 90%',
            '--border': '30 18% 22%',
            '--input': '30 18% 22%',
            '--ring': '42 70% 72%',
          } as React.CSSProperties
        }
      >
        {children}
      </div>
    </StoreProvider>
  )
}
