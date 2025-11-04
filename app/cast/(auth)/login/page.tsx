import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { CastLoginForm } from '@/components/cast-portal/login-form'

export default async function CastLoginPage() {
  const session = await getServerSession(authOptions)

  if (session?.user?.role === 'cast') {
    redirect('/cast/dashboard')
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-4 py-12">
      <CastLoginForm />
    </div>
  )
}
