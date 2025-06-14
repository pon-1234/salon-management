import { notFound } from 'next/navigation'
import { getStoreBySlug } from '@/lib/store/data'
import { RegisterForm } from '@/components/auth/register-form'
import { StoreNavigation } from '@/components/store-navigation'
import { StoreFooter } from '@/components/store-footer'

export default async function RegisterPage({ 
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
          <RegisterForm store={store} />
        </div>
        
        <StoreFooter store={store} />
      </main>
    </>
  )
}