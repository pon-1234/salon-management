import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import logger from '@/lib/logger'

export async function GET(request: NextRequest) {
  try {
    const reservationId = request.nextUrl.searchParams.get('reservationId')

    if (!reservationId) {
      return NextResponse.json({ error: 'reservationId is required' }, { status: 400 })
    }

    const history = await db.reservationHistory.findMany({
      where: { reservationId },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(history)
  } catch (error) {
    logger.error({ err: error }, 'Failed to fetch reservation history')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
