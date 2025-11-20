import { notFound } from 'next/navigation'
import { fetchStoreBySlug } from '@/lib/store/public-api'
import { ForgotPasswordForm } from '@/components/auth/forgot-password-form'
import { StoreNavigation } from '@/components/store-navigation'
import { StoreFooter } from '@/components/store-footer'

export default async function ForgotPasswordPage({
  params,
}: {
  params: { store: string }
}) {
  const { store: storeSlug } = params
  const store = await fetchStoreBySlug(storeSlug)

  if (!store) {
    notFound()
  }

  return (
    <>
      <StoreNavigation />

      <main className="min-h-screen bg-gray-50">
        <div className="mx-auto max-w-md px-4 py-12">
          <ForgotPasswordForm store={store} />
        </div>

        <StoreFooter store={store} />
      </main>
    </>
  )
}
