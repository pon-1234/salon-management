import { notFound } from 'next/navigation'
import { getStoreBySlug } from '@/lib/store/data'
import { MyPageContent } from '@/components/mypage/mypage-content'
import { StoreNavigation } from '@/components/store-navigation'
import { StoreFooter } from '@/components/store-footer'

export default async function MyPage({ 
  params 
}: { 
  params: Promise<{ store: string }> 
}) {
  const { store: storeSlug } = await params
  const store = getStoreBySlug(storeSlug)

  if (!store) {
    notFound()
  }

  // In a real app, you would check authentication here
  // and redirect to login if not authenticated

  return (
    <>
      <StoreNavigation />
      
      <main className="min-h-screen bg-gray-50">
        <MyPageContent store={store} />
        
        <StoreFooter store={store} />
      </main>
    </>
  )
}