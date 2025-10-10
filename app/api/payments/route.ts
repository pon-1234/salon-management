/**
 * @design_doc   Issue #5 - Payment System Integration
 * @related_to   PaymentService (business logic), Next.js API routes
 * @known_issues None identified
 */

import { NextRequest, NextResponse } from 'next/server'
import { ProcessPaymentRequest } from '@/lib/payment/types'
import {
  getPaymentProviderDisabledReason,
  getPaymentService,
  isPaymentProviderEnabled,
} from '@/lib/payment/providers/registry'
import { PaymentProviderNotFoundError } from '@/lib/payment/errors'

const paymentService = getPaymentService()

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate required fields
    const { reservationId, customerId, amount, currency, paymentMethod } = body
    const provider = body.provider ?? 'manual'

    if (!reservationId || !customerId || !amount || !currency || !paymentMethod) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (!isPaymentProviderEnabled(provider)) {
      return NextResponse.json(
        {
          error:
            getPaymentProviderDisabledReason(provider) ||
            `Payment provider ${provider} is not available`,
        },
        { status: 503 }
      )
    }

    const paymentRequest: ProcessPaymentRequest = {
      reservationId,
      customerId,
      amount,
      currency,
      paymentMethod,
      provider,
      metadata: body.metadata,
    }

    const result = await paymentService.processPayment(paymentRequest)

    if (result.success) {
      return NextResponse.json(result)
    } else {
      return NextResponse.json(result, { status: 400 })
    }
  } catch (error) {
    if (error instanceof PaymentProviderNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 503 })
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const customerId = searchParams.get('customerId')
    const reservationId = searchParams.get('reservationId')

    if (!customerId && !reservationId) {
      return NextResponse.json(
        { error: 'customerId or reservationId is required' },
        { status: 400 }
      )
    }

    let transactions
    if (customerId) {
      transactions = await paymentService.getPaymentHistory(customerId)
    } else if (reservationId) {
      transactions = await paymentService.getPaymentHistoryByReservation(reservationId)
    }

    return NextResponse.json({ transactions })
  } catch (error) {
    if (error instanceof PaymentProviderNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 503 })
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
