/**
 * @design_doc   Customer MyPage with session management and access control
 * @related_to   NextAuth.js configuration, customer authentication
 * @known_issues None currently
 */
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { notFound } from 'next/navigation'
import { fetchStoreBySlug } from '@/lib/store/public-api'
import { MyPageContent } from '@/components/mypage/mypage-content'
import { StoreNavigation } from '@/components/store-navigation'
import { StoreFooter } from '@/components/store-footer'

export default async function MyPage({ params }: { params: { store: string } }) {
  const { store: storeSlug } = params
  const store = await fetchStoreBySlug(storeSlug)

  if (!store) {
    notFound()
  }

  // Check authentication
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect(`/${storeSlug}/login?callbackUrl=${encodeURIComponent(`/${storeSlug}/mypage`)}`)
  }

  // Ensure user is a customer (not admin)
  if (session.user.role !== 'customer') {
    redirect(`/${storeSlug}/login?callbackUrl=${encodeURIComponent(`/${storeSlug}/mypage`)}`)
  }

  return (
    <>
      <StoreNavigation />

      <main className="min-h-screen bg-gray-50">
        <MyPageContent store={store} />
      </main>

      <StoreFooter store={store} />
    </>
  )
}
