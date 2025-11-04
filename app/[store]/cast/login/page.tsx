import { CastLoginForm } from '@/components/cast-portal/login-form'

export default function StoreCastLoginPage({ params }: { params: { store: string } }) {
  const { store } = params

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-4 py-12">
      <CastLoginForm storeSlug={store} />
    </div>
  )
}
