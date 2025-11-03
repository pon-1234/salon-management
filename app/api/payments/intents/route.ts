/**
 * @design_doc   Issue #5 - Payment System Integration
 * @related_to   PaymentService (business logic), Payment Intent API
 * @known_issues None identified
 */

import { NextRequest, NextResponse } from 'next/server'
import type { PaymentMethod, PaymentProviderType } from '@/lib/payment/types'
import { ProcessPaymentRequest } from '@/lib/payment/types'
import {
  getPaymentProviderDisabledReason,
  getPaymentService,
  isPaymentProviderEnabled,
} from '@/lib/payment/providers/registry'
import { PaymentProviderNotFoundError } from '@/lib/payment/errors'

const paymentService = getPaymentService()

function ensureProvider(provider: string) {
  if (!isPaymentProviderEnabled(provider)) {
    const reason = getPaymentProviderDisabledReason(provider)
    return NextResponse.json(
      {
        error: reason || `Payment provider ${provider} is not available`,
      },
      { status: 503 }
    )
  }
  return null
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate required fields
    const { reservationId, customerId, amount, currency, paymentMethod } = body
    const provider: PaymentProviderType =
      typeof body.provider === 'string' && ['manual', 'bank_transfer', 'cash'].includes(body.provider)
        ? body.provider
        : 'manual'

    if (
      typeof reservationId !== 'string' ||
      typeof customerId !== 'string' ||
      typeof amount !== 'number' ||
      typeof currency !== 'string' ||
      typeof paymentMethod !== 'string'
    ) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const paymentRequest: ProcessPaymentRequest = {
      reservationId,
      customerId,
      amount,
      currency,
      paymentMethod: paymentMethod as PaymentMethod,
      provider,
      metadata: body.metadata,
    }

    const providerErrorResponse = ensureProvider(provider)
    if (providerErrorResponse) {
      return providerErrorResponse
    }

    const intent = await paymentService.createPaymentIntent(paymentRequest)

    return NextResponse.json({ intent })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { intentId } = body

    if (!intentId) {
      return NextResponse.json({ error: 'intentId is required' }, { status: 400 })
    }

    const result = await paymentService.confirmPaymentIntent(intentId)

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
