import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { CastPerformanceContent } from '@/components/cast-portal/performance-content'
import { getCastPerformanceSnapshot, resolveCastStoreId } from '@/lib/cast-portal/server'

export default async function CastPerformancePage() {
  const session = await getServerSession(authOptions)

  if (!session || session.user.role !== 'cast') {
    redirect('/cast/login')
  }

  const storeId = await resolveCastStoreId(session.user.id, session.user.storeId)
  const snapshot = await getCastPerformanceSnapshot(session.user.id, storeId)

  return <CastPerformanceContent initialData={snapshot} />
}
