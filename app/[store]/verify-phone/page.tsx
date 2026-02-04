import { VerifyPhoneForm } from '@/components/auth/verify-phone-form'
import { fetchStoreBySlug } from '@/lib/store/public-api'
import { StoreNavigation } from '@/components/store-navigation'
import { StoreFooter } from '@/components/store-footer'

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
    <>
      <StoreNavigation />
      <main className="min-h-screen bg-[#0b0b0b] text-foreground">
        <div className="border-b border-[#2f2416] bg-[#0f0f0f] py-10">
          <div className="mx-auto max-w-3xl px-4 text-center">
            <p className="luxury-display text-xs tracking-[0.4em] text-[#d7b46a]">PHONE VERIFY</p>
            <h1 className="mt-4 text-2xl font-semibold text-[#f7e2b5] md:text-3xl">電話番号の認証</h1>
            <p className="mt-2 text-sm text-[#d7c39c]">SMSで届く認証コードを入力してください</p>
          </div>
        </div>
        <div className="mx-auto flex max-w-xl items-center justify-center p-6 py-12">
          <VerifyPhoneForm storeSlug={store.slug} />
        </div>
        <StoreFooter store={store} />
      </main>
    </>
  )
}
