import { notFound } from 'next/navigation'
import { getStoreBySlug } from '@/lib/store/data'
import { LoginForm } from '@/components/auth/login-form'
import { StoreNavigation } from '@/components/store-navigation'
import { StoreFooter } from '@/components/store-footer'

export default async function LoginPage({ 
  params 
}: { 
  params: Promise<{ store: string }> 
}) {
  const { store: storeSlug } = await params
  const store = getStoreBySlug(storeSlug)

  if (!store) {
    notFound()
  }

  return (
    <>
      <StoreNavigation />
      
      <main className="min-h-screen bg-gray-50">
        <div className="max-w-md mx-auto px-4 py-12">
          <LoginForm store={store} />
        </div>
        
        <StoreFooter store={store} />
      </main>
    </>
  )
}