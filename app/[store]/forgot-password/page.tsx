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

      <main className="min-h-screen bg-[#0b0b0b] text-foreground">
        <div className="border-b border-[#2f2416] bg-[#0f0f0f] py-10">
          <div className="mx-auto max-w-3xl px-4 text-center">
            <p className="luxury-display text-xs tracking-[0.4em] text-[#d7b46a]">PASSWORD RESET</p>
            <h1 className="mt-4 text-2xl font-semibold text-[#f7e2b5] md:text-3xl">パスワード再設定</h1>
            <p className="mt-2 text-sm text-[#d7c39c]">登録済みのメールアドレスへ再設定リンクを送信します</p>
          </div>
        </div>
        <div className="mx-auto max-w-md px-4 py-12">
          <ForgotPasswordForm store={store} />
        </div>

        <StoreFooter store={store} />
      </main>
    </>
  )
}
