import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { db } from '@/lib/db'
import logger from '@/lib/logger'

interface RouteParams {
  params: {
    email: string
  }
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const rawEmail = params.email ? decodeURIComponent(params.email) : ''
    const trimmedEmail = rawEmail.trim()
    if (!trimmedEmail) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    const normalizedEmail = trimmedEmail.toLowerCase()

    const isAdmin = session.user?.role === 'admin'
    const sessionEmail = session.user?.email || ''
    const isSelfLookup = sessionEmail.toLowerCase() === normalizedEmail

    if (!isAdmin && !isSelfLookup) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const customer = await db.customer.findFirst({
      where: {
        email: {
          equals: trimmedEmail,
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

    const { password, ...customerData } = customer
    return NextResponse.json(customerData)
  } catch (error) {
    logger.error({ err: error }, 'Failed to fetch customer by email')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
