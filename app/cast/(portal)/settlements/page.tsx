import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { getCastSettlements, resolveCastStoreId } from '@/lib/cast-portal/server'
import { CastSettlementsContent } from '@/components/cast-portal/settlements-content'
import type { CastSettlementsData } from '@/lib/cast-portal/types'

export default async function CastSettlementsPage() {
  const session = await getServerSession(authOptions)

  if (!session || session.user.role !== 'cast') {
    redirect('/cast/login')
  }

  const empty: CastSettlementsData = {
    summary: {
      month: new Date().toISOString().slice(0, 7),
      totalRevenue: 0,
      staffRevenue: 0,
      storeRevenue: 0,
      welfareExpense: 0,
      completedCount: 0,
      pendingCount: 0,
    },
    days: [],
  }

  let settlements: CastSettlementsData = empty
  try {
    const storeId = await resolveCastStoreId(session.user.id, session.user.storeId)
    settlements = await getCastSettlements(session.user.id, storeId)
  } catch (err) {
    console.error('Failed to load cast settlements', err)
    settlements = empty
  }

  return <CastSettlementsContent initialData={settlements} />
}
