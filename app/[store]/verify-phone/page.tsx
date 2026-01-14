import { VerifyPhoneForm } from '@/components/auth/verify-phone-form'
import { fetchStoreBySlug } from '@/lib/store/public-api'

export default async function VerifyPhonePage({ params }: { params: { store: string } }) {
  const store = await fetchStoreBySlug(params.store)

  if (!store) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-xl items-center justify-center p-6 text-center text-sm text-muted-foreground">
        店舗情報が見つかりません。
      </div>
    )
  }

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-xl items-center justify-center p-6">
      <VerifyPhoneForm storeSlug={store.slug} />
    </div>
  )
}
