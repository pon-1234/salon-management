import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { CastLineLinkGuide } from '@/components/cast-portal/line-link-guide'

export default async function CastLineLinkPage() {
  const session = await getServerSession(authOptions)

  if (!session || session.user.role !== 'cast') {
    redirect('/cast/login')
  }

  return <CastLineLinkGuide castId={session.user.id} />
}
