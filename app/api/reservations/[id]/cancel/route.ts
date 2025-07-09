/**
 * @design_doc   Issue #5 - Payment System Integration
 * @related_to   ReservationService (business logic), PaymentService (payment processing)
 * @known_issues None identified
 */

import { NextRequest, NextResponse } from 'next/server'
import { ReservationService } from '@/lib/reservation/service'
import { PaymentService } from '@/lib/payment/service'
import { StripeProvider } from '@/lib/payment/providers/stripe'

const paymentService = new PaymentService({
  stripe: new StripeProvider({
    secretKey: process.env.STRIPE_SECRET_KEY || '',
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || ''
  })
})

const reservationService = new ReservationService(paymentService)

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const reservationId = params.id
    const body = await request.json()
    const { refundAmount } = body

    const result = await reservationService.cancelReservationWithRefund(reservationId, refundAmount)
    
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