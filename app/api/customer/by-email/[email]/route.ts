/**
 * @design_doc   Next 15 dynamic route params contract
 * @related_to   customer lookup routes: admin/self customer data lookup
 * @known_issues Administrator results remain global until customer store ownership is approved
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { db } from '@/lib/db'
import logger from '@/lib/logger'
import { hasPermission } from '@/lib/auth/permissions'
import { sanitizeCustomerSelfResponse } from '@/lib/http/customer-dto'
import { sanitizeResponseData } from '@/lib/http/sanitize-response'

interface RouteParams {
  params: Promise<{
    email: string
  }>
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { email } = await params
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const rawEmail = email ? decodeURIComponent(email) : ''
    const trimmedEmail = rawEmail.trim()
    if (!trimmedEmail) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    const normalizedEmail = trimmedEmail.toLowerCase()

    const isAdmin = session.user?.role === 'admin'
    const sessionEmail = session.user?.email || ''
    const isSelfLookup = sessionEmail.toLowerCase() === normalizedEmail

    if (isAdmin && !hasPermission(session.user.permissions ?? [], 'customer:read')) {
      return NextResponse.json({ error: 'この操作を行う権限がありません' }, { status: 403 })
    }

    if (!isAdmin && !isSelfLookup) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const customer = await db.customer.findFirst({
      where: {
        email: {
          equals: normalizedEmail,
          mode: 'insensitive',
        },
      },
      include: {
        reservations: true,
        reviews: true,
        ngCasts: true,
      },
    })

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    return NextResponse.json(
      isAdmin ? sanitizeResponseData(customer) : sanitizeCustomerSelfResponse(customer)
    )
  } catch (error) {
    logger.error(
      { errorType: error instanceof Error ? error.name : 'UnknownError' },
      'Failed to fetch customer by email'
    )
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
