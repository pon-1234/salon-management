/**
 * @design_doc   Eligible review reservation multi-store authorization
 * @related_to   Review submission form, Review service, customer:read permission
 * @known_issues None currently
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { hasPermission } from '@/lib/auth/permissions'
import { canAdminAccessStore } from '@/lib/auth/store-access'
import logger from '@/lib/logger'
import { getEligibleReservationsForCustomer } from '@/lib/reviews/service'
import { ensureStoreId, resolveStoreId } from '@/lib/store/server'

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

    const requestedStoreId = await resolveStoreId(request)
    const customerIdParam = request.nextUrl.searchParams.get('customerId')

    if (!requestedStoreId) {
      return NextResponse.json({ error: 'storeId is required' }, { status: 400 })
    }
    const storeId = await ensureStoreId(requestedStoreId)

    if (role === 'admin' && !canAdminAccessStore(session.user, storeId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (role === 'admin' && !hasPermission(session.user.permissions ?? [], 'customer:read')) {
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
