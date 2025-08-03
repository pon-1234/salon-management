/**
 * @design_doc   Stripe Webhook handler for payment events
 * @related_to   PaymentService, StripeProvider
 * @known_issues Webhook secret must be configured in production
 */

import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { db } from '@/lib/db'
import logger from '@/lib/logger'

// Initialize Stripe with validation
const stripeSecretKey = process.env.STRIPE_SECRET_KEY
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

if (!stripeSecretKey) {
  logger.error('STRIPE_SECRET_KEY is not configured')
}

if (!webhookSecret) {
  logger.error('STRIPE_WEBHOOK_SECRET is not configured')
}

const stripe = stripeSecretKey
  ? new Stripe(stripeSecretKey, {
      apiVersion: '2025-06-30.basil',
      typescript: true,
    })
  : null

export async function POST(request: NextRequest) {
  if (!stripe || !webhookSecret) {
    logger.error('Stripe is not properly configured')
    return NextResponse.json({ error: 'Payment system not configured' }, { status: 500 })
  }

  const body = await request.text()
  const sig = request.headers.get('stripe-signature')

  if (!sig) {
    return NextResponse.json({ error: 'Missing stripe signature' }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
  } catch (err) {
    logger.error({ err }, 'Webhook signature verification failed')
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  // Handle the event
  try {
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent)
        break

      case 'payment_intent.payment_failed':
        await handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent)
        break

      case 'charge.refunded':
        await handleChargeRefunded(event.data.object as Stripe.Charge)
        break

      case 'payment_intent.canceled':
        await handlePaymentIntentCanceled(event.data.object as Stripe.PaymentIntent)
        break

      default:
        logger.info({ type: event.type }, 'Unhandled webhook event type')
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    logger.error({ err: error, eventType: event.type }, 'Error processing webhook')
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}

async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  const { id, amount, currency, metadata } = paymentIntent

  logger.info({ paymentIntentId: id }, 'Payment intent succeeded')

  // Update payment transaction status
  await db.paymentTransaction.updateMany({
    where: {
      OR: [{ paymentIntentId: id }, { stripePaymentId: id }],
    },
    data: {
      status: 'completed',
      processedAt: new Date(),
      updatedAt: new Date(),
    },
  })

  // Update payment intent status
  await db.paymentIntent.updateMany({
    where: {
      OR: [{ providerId: id }, { id: metadata.paymentIntentId || '' }],
    },
    data: {
      status: 'completed',
      updatedAt: new Date(),
    },
  })

  // Update reservation status if applicable
  if (metadata.reservationId) {
    await db.reservation.update({
      where: { id: metadata.reservationId },
      data: {
        status: 'confirmed',
        updatedAt: new Date(),
      },
    })
  }
}

async function handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
  const { id, last_payment_error, metadata } = paymentIntent

  logger.error({ paymentIntentId: id, error: last_payment_error }, 'Payment intent failed')

  // Update payment transaction status
  await db.paymentTransaction.updateMany({
    where: {
      OR: [{ paymentIntentId: id }, { stripePaymentId: id }],
    },
    data: {
      status: 'failed',
      errorMessage: last_payment_error?.message || 'Payment failed',
      updatedAt: new Date(),
    },
  })

  // Update payment intent status
  await db.paymentIntent.updateMany({
    where: {
      OR: [{ providerId: id }, { id: metadata.paymentIntentId || '' }],
    },
    data: {
      status: 'failed',
      errorMessage: last_payment_error?.message || 'Payment failed',
      updatedAt: new Date(),
    },
  })
}

async function handleChargeRefunded(charge: Stripe.Charge) {
  const { id, payment_intent, amount_refunded, metadata } = charge

  logger.info({ chargeId: id, refundAmount: amount_refunded }, 'Charge refunded')

  if (typeof payment_intent === 'string') {
    // Update payment transaction with refund info
    await db.paymentTransaction.updateMany({
      where: {
        OR: [{ paymentIntentId: payment_intent }, { stripePaymentId: payment_intent }],
      },
      data: {
        status: 'refunded',
        refundedAt: new Date(),
        refundAmount: amount_refunded,
        updatedAt: new Date(),
      },
    })
  }
}

async function handlePaymentIntentCanceled(paymentIntent: Stripe.PaymentIntent) {
  const { id, metadata } = paymentIntent

  logger.info({ paymentIntentId: id }, 'Payment intent canceled')

  // Update payment transaction status
  await db.paymentTransaction.updateMany({
    where: {
      OR: [{ paymentIntentId: id }, { stripePaymentId: id }],
    },
    data: {
      status: 'cancelled',
      updatedAt: new Date(),
    },
  })

  // Update payment intent status
  await db.paymentIntent.updateMany({
    where: {
      OR: [{ providerId: id }, { id: metadata.paymentIntentId || '' }],
    },
    data: {
      status: 'cancelled',
      updatedAt: new Date(),
    },
  })
}
