/**
 * @design_doc   Issue #5 - Authenticated, reservation-bound payment API
 * @related_to   PaymentService, Reservation, administrator store assignments
 * @known_issues Online payment processing remains disabled until provider reconciliation is approved
 */

import { getServerSession } from 'next-auth'
import { NextRequest, NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth/config'
import { hasPermission } from '@/lib/auth/permissions'
import { db } from '@/lib/db'
import logger from '@/lib/logger'
import {
  getPaymentProviderDisabledReason,
  getPaymentService,
  isPaymentProviderEnabled,
} from '@/lib/payment/providers/registry'
import {
  ActivePaymentConflictError,
  isActivePaymentConflictError,
  PaymentProviderNotFoundError,
} from '@/lib/payment/errors'
import {
  authorizePaymentReservation,
  buildCanonicalPaymentRequest,
  containsServerManagedPaymentFields,
  findPaymentReservation,
  resolveReservationPaymentMethod,
  toPublicPaymentTransaction,
  validateReservationClaims,
} from '@/lib/payment/api-boundary'
import { canAdminAccessStore } from '@/lib/auth/store-access'
import type { PaymentProviderType, PaymentStatus, PaymentTransaction } from '@/lib/payment/types'

const paymentService = getPaymentService()
const PAYMENT_STATUSES = new Set<PaymentStatus>([
  'pending',
  'processing',
  'completed',
  'failed',
  'cancelled',
  'refunded',
])
const PAYMENT_PROVIDERS = new Set<PaymentProviderType>(['manual', 'bank_transfer', 'cash'])

function authenticationRequired() {
  return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
}

function invalidBody() {
  return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
}

function activePaymentConflict() {
  const conflict = new ActivePaymentConflictError()
  return NextResponse.json({ error: conflict.message, code: conflict.code }, { status: 409 })
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

    // Direct processing records a completed offline payment, so customers and casts may not call it.
    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (!hasPermission(session.user.permissions ?? [], 'reservation:update')) {
      return NextResponse.json({ error: 'この操作を行う権限がありません' }, { status: 403 })
    }

    const body = await parseObjectBody(request)
    if (!body) {
      return invalidBody()
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
    if (reservation.status === 'cancelled') {
      return NextResponse.json({ error: 'Cancelled reservations cannot be paid' }, { status: 409 })
    }
    if (!Number.isInteger(reservation.price) || reservation.price <= 0) {
      return NextResponse.json({ error: 'Reservation amount is not payable' }, { status: 409 })
    }

    const paymentMethod = resolveReservationPaymentMethod(reservation.paymentMethod)
    if (!paymentMethod) {
      return NextResponse.json(
        { error: 'Reservation payment method is not supported' },
        { status: 409 }
      )
    }

    const claimsError = validateReservationClaims(body, reservation, paymentMethod)
    if (claimsError) {
      return claimsError
    }

    if (body.provider !== undefined && body.provider !== 'manual') {
      return NextResponse.json(
        { error: 'Only offline manual payments are supported' },
        { status: 400 }
      )
    }
    if (!isPaymentProviderEnabled('manual')) {
      return NextResponse.json(
        {
          error:
            getPaymentProviderDisabledReason('manual') ||
            'Manual payment provider is not available',
        },
        { status: 503 }
      )
    }

    const existingPayment = await db.paymentTransaction.findFirst({
      where: {
        reservationId: reservation.id,
        type: 'payment',
        status: { in: ['pending', 'processing', 'completed'] },
      },
      select: { id: true },
    })
    if (existingPayment) {
      return activePaymentConflict()
    }

    const result = await paymentService.processPayment(
      buildCanonicalPaymentRequest(reservation, paymentMethod)
    )

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 })
    }
    if (!result.transaction) {
      return NextResponse.json(
        { error: 'Payment provider returned no transaction' },
        { status: 502 }
      )
    }

    return NextResponse.json({
      success: true,
      transaction: toPublicPaymentTransaction(result.transaction),
    })
  } catch (error) {
    if (isActivePaymentConflictError(error)) {
      return activePaymentConflict()
    }
    if (error instanceof PaymentProviderNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 503 })
    }
    logger.error({ err: error }, 'Failed to process payment')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return authenticationRequired()
    }
    if (session.user.role !== 'customer' && session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const customerId = request.nextUrl.searchParams.get('customerId')
    const reservationId = request.nextUrl.searchParams.get('reservationId')
    const storeId = request.nextUrl.searchParams.get('storeId')?.trim()

    if (session.user.role === 'admin' && storeId && !customerId && !reservationId) {
      if (!hasPermission(session.user.permissions ?? [], 'analytics:read')) {
        return NextResponse.json({ error: 'この操作を行う権限がありません' }, { status: 403 })
      }
      if (!canAdminAccessStore(session.user, storeId)) {
        return NextResponse.json({ error: 'この店舗を操作する権限がありません' }, { status: 403 })
      }

      const searchParams = request.nextUrl.searchParams
      const limit = Number(searchParams.get('limit') ?? '25')
      const offset = Number(searchParams.get('offset') ?? '0')
      const status = searchParams.get('status')
      const provider = searchParams.get('provider')
      const startDate = searchParams.get('startDate')
      const endDate = searchParams.get('endDate')

      if (
        !Number.isInteger(limit) ||
        limit < 1 ||
        limit > 100 ||
        !Number.isInteger(offset) ||
        offset < 0 ||
        (status && !PAYMENT_STATUSES.has(status as PaymentStatus)) ||
        (provider && !PAYMENT_PROVIDERS.has(provider as PaymentProviderType))
      ) {
        return NextResponse.json({ error: 'Invalid payment list query' }, { status: 400 })
      }

      const createdAt =
        startDate && endDate
          ? {
              gte: new Date(startDate),
              lte: new Date(endDate),
            }
          : undefined
      if (
        createdAt &&
        (Number.isNaN(createdAt.gte.getTime()) || Number.isNaN(createdAt.lte.getTime()))
      ) {
        return NextResponse.json({ error: 'Invalid payment date range' }, { status: 400 })
      }

      const transactions = await db.paymentTransaction.findMany({
        where: {
          reservation: { storeId },
          reservationId: { not: null },
          customerId: { not: null },
          ...(status ? { status } : {}),
          ...(provider ? { provider } : {}),
          ...(createdAt ? { createdAt } : {}),
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      })

      return NextResponse.json({
        transactions: transactions.map((transaction) =>
          toPublicPaymentTransaction(transaction as PaymentTransaction)
        ),
      })
    }

    if ((!customerId && !reservationId) || (customerId && reservationId)) {
      return NextResponse.json(
        { error: 'Exactly one of customerId or reservationId is required' },
        { status: 400 }
      )
    }

    if (customerId) {
      if (session.user.role !== 'customer') {
        return NextResponse.json(
          { error: 'Administrators must query payment history by reservationId' },
          { status: 400 }
        )
      }
      if (session.user.id !== customerId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      const transactions = await paymentService.getPaymentHistory(session.user.id)
      return NextResponse.json({
        transactions: transactions.map(toPublicPaymentTransaction),
      })
    }

    const reservation = await findPaymentReservation(reservationId as string)
    if (!reservation) {
      return NextResponse.json({ error: 'Reservation not found' }, { status: 404 })
    }

    if (session.user.role === 'admin') {
      if (!hasPermission(session.user.permissions ?? [], 'reservation:read')) {
        return NextResponse.json({ error: 'この操作を行う権限がありません' }, { status: 403 })
      }
      if (!canAdminAccessStore(session.user, reservation.storeId)) {
        return NextResponse.json({ error: 'この店舗を操作する権限がありません' }, { status: 403 })
      }
    } else if (session.user.id !== reservation.customerId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const transactions = await paymentService.getPaymentHistoryByReservation(reservation.id)
    return NextResponse.json({
      transactions: transactions.map(toPublicPaymentTransaction),
    })
  } catch (error) {
    if (error instanceof PaymentProviderNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 503 })
    }
    logger.error({ err: error }, 'Failed to fetch payment history')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
