import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { getCastReservations, resolveCastStoreId } from '@/lib/cast-portal/server'
import { CastReservationsContent } from '@/components/cast-portal/reservations-content'

export default async function CastReservationsPage() {
  const session = await getServerSession(authOptions)

  if (!session || session.user.role !== 'cast') {
    redirect('/cast/login')
  }

  const storeId = await resolveCastStoreId(session.user.id, session.user.storeId)
  const initialReservations = await getCastReservations(session.user.id, storeId, {
    scope: 'upcoming',
    limit: 50,
  })

  return <CastReservationsContent initialData={initialReservations} />
}
