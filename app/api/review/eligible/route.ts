import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import logger from '@/lib/logger'
import { getEligibleReservationsForCustomer } from '@/lib/reviews/service'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const role = session.user.role
    if (role !== 'customer' && role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const searchParams = request.nextUrl.searchParams
    const storeId = searchParams.get('storeId')
    const customerIdParam = searchParams.get('customerId')

    let targetCustomerId = session.user.id
    if (customerIdParam && role === 'admin') {
      targetCustomerId = customerIdParam
    } else if (customerIdParam && customerIdParam !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const reservations = await getEligibleReservationsForCustomer(targetCustomerId, storeId ?? undefined)
    return NextResponse.json(reservations)
  } catch (error) {
    logger.error({ err: error }, 'Failed to fetch eligible reservations for reviews')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
