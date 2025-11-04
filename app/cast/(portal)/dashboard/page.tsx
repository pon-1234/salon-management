import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { CastDashboardContent } from '@/components/cast-portal/dashboard-content'
import { getCastDashboardData, resolveCastStoreId } from '@/lib/cast-portal/server'

export default async function CastDashboardPage() {
  const session = await getServerSession(authOptions)

  if (!session || session.user.role !== 'cast') {
    redirect('/cast/login')
  }

  const storeId = await resolveCastStoreId(session.user.id, session.user.storeId)
  const dashboardData = await getCastDashboardData(session.user.id, storeId)

  return <CastDashboardContent initialData={dashboardData} />
}
