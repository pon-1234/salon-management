/**
 * @design_doc   Issue #5 - Payment System Integration
 * @related_to   PaymentService (business logic), Payment Intent API
 * @known_issues None identified
 */

import { NextRequest, NextResponse } from 'next/server'
import { PaymentService } from '@/lib/payment/service'
import { StripeProvider } from '@/lib/payment/providers/stripe'
import { ProcessPaymentRequest } from '@/lib/payment/types'

const paymentService = new PaymentService({
  stripe: new StripeProvider({
    secretKey: process.env.STRIPE_SECRET_KEY || '',
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || ''
  })
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate required fields
    const { reservationId, customerId, amount, currency, paymentMethod, provider } = body
    
    if (!reservationId || !customerId || !amount || !currency || !paymentMethod || !provider) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const paymentRequest: ProcessPaymentRequest = {
      reservationId,
      customerId,
      amount,
      currency,
      paymentMethod,
      provider,
      metadata: body.metadata
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
      return NextResponse.json(
        { error: 'intentId is required' },
        { status: 400 }
      )
    }

    const result = await paymentService.confirmPaymentIntent(intentId)
    
    if (result.success) {
      return NextResponse.json(result)
    } else {
      return NextResponse.json(result, { status: 400 })
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}