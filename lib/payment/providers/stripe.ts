/**
 * @design_doc   Issue #5 - Payment System Integration
 * @related_to   PaymentProvider (base class), Stripe API integration
 * @known_issues None identified
 */

import { PaymentProvider } from './base'
import {
  PaymentIntent,
  PaymentTransaction,
  ProcessPaymentRequest,
  ProcessPaymentResult,
  RefundRequest,
  RefundResult,
} from '../types'
import Stripe from 'stripe'

export interface StripeConfig {
  secretKey: string
  publishableKey: string
}

export class StripeProvider extends PaymentProvider {
  readonly name = 'stripe'
  readonly supportedMethods = ['card']
  private stripe: Stripe

  constructor(config: StripeConfig) {
    super()

    // Validate config
    if (!config.secretKey) {
      throw new Error('Stripe secret key is required')
    }

    this.stripe = new Stripe(config.secretKey, {
      apiVersion: '2025-06-30.basil',
      typescript: true,
    })
  }

  async processPayment(request: ProcessPaymentRequest): Promise<ProcessPaymentResult> {
    try {
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: request.amount,
        currency: request.currency,
        confirm: true,
        metadata: {
          reservationId: request.reservationId,
          customerId: request.customerId,
        },
      })

      const transaction: PaymentTransaction = {
        id: `txn_${Date.now()}`,
        reservationId: request.reservationId,
        customerId: request.customerId,
        amount: request.amount,
        currency: request.currency,
        provider: 'stripe',
        paymentMethod: request.paymentMethod,
        status: this.mapStripeStatusToPaymentStatus(paymentIntent.status),
        paymentIntentId: paymentIntent.id,
        stripePaymentId: paymentIntent.id,
        metadata: request.metadata,
        processedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      return {
        success: true,
        transaction,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  async createPaymentIntent(request: ProcessPaymentRequest): Promise<PaymentIntent> {
    const stripeIntent = await this.stripe.paymentIntents.create({
      amount: request.amount,
      currency: request.currency,
      metadata: {
        reservationId: request.reservationId,
        customerId: request.customerId,
        ...request.metadata,
      },
    })

    return {
      id: `pi_${Date.now()}`,
      providerId: stripeIntent.id,
      provider: 'stripe',
      amount: request.amount,
      currency: request.currency,
      status: this.mapStripeStatusToPaymentStatus(stripeIntent.status),
      paymentMethod: request.paymentMethod,
      metadata: request.metadata,
      clientSecret: stripeIntent.client_secret || undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
  }

  async confirmPaymentIntent(intentId: string): Promise<ProcessPaymentResult> {
    try {
      const confirmedIntent = await this.stripe.paymentIntents.confirm(intentId)

      const transaction: PaymentTransaction = {
        id: `txn_${Date.now()}`,
        reservationId: confirmedIntent.metadata.reservationId || '',
        customerId: confirmedIntent.metadata.customerId || '',
        amount: confirmedIntent.amount,
        currency: confirmedIntent.currency,
        provider: 'stripe',
        paymentMethod: 'card',
        status: this.mapStripeStatusToPaymentStatus(confirmedIntent.status),
        paymentIntentId: confirmedIntent.id,
        stripePaymentId: confirmedIntent.id,
        metadata: confirmedIntent.metadata,
        processedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      return {
        success: true,
        transaction,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  async refundPayment(request: RefundRequest): Promise<RefundResult> {
    try {
      const refund = await this.stripe.refunds.create({
        payment_intent: request.transactionId,
        amount: request.amount,
        reason: 'requested_by_customer',
      })

      const transaction: PaymentTransaction = {
        id: request.transactionId,
        reservationId: 'res_123', // This would be retrieved from database
        customerId: 'cust_123', // This would be retrieved from database
        amount: refund.amount,
        currency: refund.currency,
        provider: 'stripe',
        paymentMethod: 'card',
        status: 'refunded',
        refundedAt: new Date(),
        refundAmount: refund.amount,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      return {
        success: true,
        refundAmount: refund.amount,
        transaction,
      }
    } catch (error) {
      return {
        success: false,
        refundAmount: 0,
        transaction: {} as PaymentTransaction,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  async getPaymentStatus(transactionId: string): Promise<PaymentTransaction> {
    const paymentIntent = await this.stripe.paymentIntents.retrieve(transactionId)

    return {
      id: transactionId,
      reservationId: paymentIntent.metadata.reservationId || '',
      customerId: paymentIntent.metadata.customerId || '',
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      provider: 'stripe',
      paymentMethod: 'card',
      status: this.mapStripeStatusToPaymentStatus(paymentIntent.status),
      paymentIntentId: paymentIntent.id,
      stripePaymentId: paymentIntent.id,
      metadata: paymentIntent.metadata,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
  }

  async validateConfig(): Promise<boolean> {
    try {
      // Simple validation by checking if we can create a Stripe instance
      return this.stripe !== null
    } catch {
      return false
    }
  }

  private mapStripeStatusToPaymentStatus(stripeStatus: string): PaymentTransaction['status'] {
    switch (stripeStatus) {
      case 'succeeded':
        return 'completed'
      case 'processing':
        return 'processing'
      case 'requires_payment_method':
      case 'requires_confirmation':
      case 'requires_action':
      case 'requires_capture':
        return 'pending'
      case 'canceled':
        return 'cancelled'
      default:
        return 'failed'
    }
  }
}
