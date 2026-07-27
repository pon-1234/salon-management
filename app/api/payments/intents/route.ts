/**
 * @design_doc   Issue #5 - Fail-closed online payment intent boundary
 * @related_to   Reservation, PaymentService, future signed provider webhook
 * @known_issues No online provider or signed webhook exists, so creation and confirmation are disabled
 */

import { getServerSession } from 'next-auth'
import { NextRequest, NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth/config'
import logger from '@/lib/logger'
import {
  authorizePaymentReservation,
  containsServerManagedPaymentFields,
  findPaymentReservation,
  resolveReservationPaymentMethod,
  validateReservationClaims,
} from '@/lib/payment/api-boundary'

function authenticationRequired() {
  return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
}

async function parseObjectBody(request: NextRequest): Promise<Record<string, unknown> | null> {
  try {
    const value: unknown = await request.json()
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return null
    }
    return value as Record<string, unknown>
  } catch {
    return null
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return authenticationRequired()
    }
    if (session.user.role !== 'customer' && session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await parseObjectBody(request)
    if (!body) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }
    if (containsServerManagedPaymentFields(body)) {
      return NextResponse.json(
        { error: 'Server-managed payment fields are not accepted' },
        { status: 400 }
      )
    }

    const reservationId = body.reservationId
    if (typeof reservationId !== 'string' || reservationId.trim().length === 0) {
      return NextResponse.json({ error: 'reservationId is required' }, { status: 400 })
    }

    const reservation = await findPaymentReservation(reservationId)
    if (!reservation) {
      return NextResponse.json({ error: 'Reservation not found' }, { status: 404 })
    }

    const accessError = authorizePaymentReservation(session, reservation, 'reservation:update')
    if (accessError) {
      return accessError
    }

    const paymentMethod = resolveReservationPaymentMethod(reservation.paymentMethod)
    if (!paymentMethod || !Number.isInteger(reservation.price) || reservation.price <= 0) {
      return NextResponse.json(
        { error: 'Reservation payment details are not payable' },
        { status: 409 }
      )
    }

    const claimsError = validateReservationClaims(body, reservation, paymentMethod)
    if (claimsError) {
      return claimsError
    }

    return NextResponse.json(
      { error: 'Online payment intents are not configured' },
      { status: 503 }
    )
  } catch (error) {
    logger.error({ err: error }, 'Failed to validate payment intent creation')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return authenticationRequired()
    }
    if (session.user.role !== 'customer' && session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await parseObjectBody(request)
    if (!body) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }
    if (containsServerManagedPaymentFields(body)) {
      return NextResponse.json(
        { error: 'Server-managed payment fields are not accepted' },
        { status: 400 }
      )
    }
    if (typeof body.intentId !== 'string' || body.intentId.trim().length === 0) {
      return NextResponse.json({ error: 'intentId is required' }, { status: 400 })
    }

    // PaymentIntent has no trusted reservation relation and there is no signed provider webhook.
    // Confirmation therefore cannot be authorized safely and must remain disabled.
    return NextResponse.json(
      { error: 'Payment intent confirmation requires a signed provider callback' },
      { status: 503 }
    )
  } catch (error) {
    logger.error({ err: error }, 'Failed to validate payment intent confirmation')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
