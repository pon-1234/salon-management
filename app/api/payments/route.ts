/**
 * @design_doc   Issue #5 - Payment System Integration
 * @related_to   PaymentService (business logic), Next.js API routes
 * @known_issues None identified
 */

import { NextRequest, NextResponse } from 'next/server'
import { PaymentService } from '@/lib/payment/service'
import { StripeProvider } from '@/lib/payment/providers/stripe'
import { ProcessPaymentRequest } from '@/lib/payment/types'

// Initialize payment service with environment validation
const stripeConfig = {
  secretKey: process.env.STRIPE_SECRET_KEY || (() => {
    console.error('STRIPE_SECRET_KEY is not set in environment variables')
    return ''
  })(),
  publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || (() => {
    console.error('STRIPE_PUBLISHABLE_KEY is not set in environment variables')
    return ''
  })()
}

// Only initialize Stripe provider if keys are available
const paymentProviders: Record<string, any> = stripeConfig.secretKey ? {
  stripe: new StripeProvider(stripeConfig)
} : {}

const paymentService = new PaymentService(paymentProviders)

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

    const result = await paymentService.processPayment(paymentRequest)
    
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
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}