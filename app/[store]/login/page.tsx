/**
 * @design_doc   ui-improvement-instructions.md U-12 metadata
 * @related_to   StoreLayout: store-specific title template; LoginForm: customer login surface
 * @known_issues Callback URL details are not reflected in metadata
 */
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { fetchStoreBySlug } from '@/lib/store/public-api'
import { LoginForm } from '@/components/auth/login-form'
import { StoreNavigation } from '@/components/store-navigation'
import { StoreFooter } from '@/components/store-footer'

export const metadata: Metadata = {
  title: 'ログイン',
}

export default async function LoginPage({ params }: { params: Promise<{ store: string }> }) {
  const { store: storeSlug } = await params
  const store = await fetchStoreBySlug(storeSlug)

  if (!store) {
    notFound()
  }

  return (
    <>
      <StoreNavigation />

      <main className="min-h-screen bg-[#0b0b0b] text-foreground">
        <div className="mx-auto max-w-md px-4 py-12">
          <LoginForm store={store} />
        </div>

        <StoreFooter store={store} />
      </main>
    </>
  )
}
