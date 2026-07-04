/**
 * @design_doc   Next 15 dynamic route params contract
 * @related_to   customer lookup routes: admin phone-based customer search
 * @known_issues Phone matching still checks both normalized and raw stored values
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { db } from '@/lib/db'
import logger from '@/lib/logger'

interface RouteParams {
  params: Promise<{
    phone: string
  }>
}

function normalizePhone(input: string): string {
  return input.replace(/[^0-9+]/g, '')
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { phone } = await params
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const phoneParam = phone ? decodeURIComponent(phone) : ''
    const normalizedPhone = normalizePhone(phoneParam)
    if (!normalizedPhone) {
      return NextResponse.json({ error: 'Phone number is required' }, { status: 400 })
    }

    const isAdmin = session.user?.role === 'admin'
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const customer = await db.customer.findFirst({
      where: {
        OR: [{ phone: normalizedPhone }, { phone: phoneParam }],
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

    const { password, ...customerData } = customer
    return NextResponse.json(customerData)
  } catch (error) {
    logger.error({ err: error }, 'Failed to fetch customer by phone')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
