/**
 * @design_doc   Eligible review reservation multi-store authorization
 * @related_to   Review submission form and Review service
 * @known_issues None currently
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { canAdminAccessStore } from '@/lib/auth/store-access'
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
    const storeId = searchParams.get('storeId')?.trim()
    const customerIdParam = searchParams.get('customerId')

    if (!storeId) {
      return NextResponse.json({ error: 'storeId is required' }, { status: 400 })
    }

    if (role === 'admin' && !canAdminAccessStore(session.user, storeId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    let targetCustomerId = session.user.id
    if (customerIdParam && role === 'admin') {
      targetCustomerId = customerIdParam
    } else if (customerIdParam && customerIdParam !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const reservations = await getEligibleReservationsForCustomer(targetCustomerId, storeId)
    return NextResponse.json(reservations)
  } catch (error) {
    logger.error({ err: error }, 'Failed to fetch eligible reservations for reviews')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
