/**
 * @design_doc   Issue #5 - Payment System Integration
 * @related_to   ReservationService (business logic), PaymentService (payment processing)
 * @known_issues None identified
 */

import { NextRequest, NextResponse } from 'next/server'
import { ReservationService } from '@/lib/reservation/service'
import { PaymentService } from '@/lib/payment/service'
import { StripeProvider } from '@/lib/payment/providers/stripe'

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
const paymentProviders = stripeConfig.secretKey ? {
  stripe: new StripeProvider(stripeConfig)
} : {}

const paymentService = new PaymentService(paymentProviders)

const reservationService = new ReservationService(paymentService)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      customerId, 
      castId, 
      courseId, 
      startTime, 
      endTime, 
      amount, 
      paymentMethod, 
      paymentProvider,
      usePaymentIntent = false 
    } = body
    
    // Validate required fields
    if (!customerId || !castId || !courseId || !startTime || !endTime || !amount || !paymentMethod || !paymentProvider) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const reservationData = {
      customerId,
      castId,
      courseId,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      amount,
      paymentMethod,
      paymentProvider
    }

    let result
    if (usePaymentIntent) {
      // Create reservation with payment intent for client-side processing
      result = await reservationService.createReservationWithPaymentIntent(reservationData)
    } else {
      // Create reservation and process payment immediately
      result = await reservationService.createReservationWithPayment(reservationData)
    }
    
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
    const reservationId = searchParams.get('id')

    if (!reservationId) {
      return NextResponse.json(
        { error: 'Reservation ID is required' },
        { status: 400 }
      )
    }

    const result = await reservationService.getReservationWithPayments(reservationId)
    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}