import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { getCastSettlements, resolveCastStoreId } from '@/lib/cast-portal/server'
import { CastSettlementsContent } from '@/components/cast-portal/settlements-content'

export default async function CastSettlementsPage() {
  const session = await getServerSession(authOptions)

  if (!session || session.user.role !== 'cast') {
    redirect('/cast/login')
  }

  const storeId = await resolveCastStoreId(session.user.id, session.user.storeId)
  const settlements = await getCastSettlements(session.user.id, storeId)

  return <CastSettlementsContent initialData={settlements} />
}
