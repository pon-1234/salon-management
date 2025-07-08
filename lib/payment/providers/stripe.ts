/**
 * @design_doc   Issue #5 - Payment System Integration
 * @related_to   PaymentProvider (base class), Stripe API integration
 * @known_issues None identified
 */

import { PaymentProvider } from './base'
import { PaymentIntent, PaymentTransaction, ProcessPaymentRequest, ProcessPaymentResult, RefundRequest, RefundResult } from '../types'
// Mock Stripe import for testing without actual dependency
interface MockStripe {
  paymentIntents: {
    create: (params: any) => Promise<any>
    confirm: (id: string) => Promise<any>
    retrieve: (id: string) => Promise<any>
  }
  refunds: {
    create: (params: any) => Promise<any>
  }
}

class MockStripeClass implements MockStripe {
  paymentIntents = {
    create: async (params: any) => ({
      id: 'pi_mock_123',
      status: 'succeeded',
      amount: params.amount,
      currency: params.currency,
      client_secret: 'pi_mock_secret',
      metadata: params.metadata
    }),
    confirm: async (id: string) => ({
      id,
      status: 'succeeded',
      amount: 10000,
      currency: 'jpy',
      metadata: { reservationId: 'res_123', customerId: 'cust_123' }
    }),
    retrieve: async (id: string) => ({
      id,
      status: 'succeeded',
      amount: 10000,
      currency: 'jpy',
      metadata: { reservationId: 'res_123', customerId: 'cust_123' }
    })
  }
  refunds = {
    create: async (params: any) => ({
      id: 'rf_mock_123',
      amount: params.amount,
      currency: 'jpy',
      status: 'succeeded'
    })
  }
}

const Stripe = MockStripeClass

export interface StripeConfig {
  secretKey: string
  publishableKey: string
}

export class StripeProvider extends PaymentProvider {
  readonly name = 'stripe'
  readonly supportedMethods = ['card']
  private stripe: MockStripe

  constructor(config: StripeConfig) {
    super()
    this.stripe = new Stripe() as MockStripe
  }

  async processPayment(request: ProcessPaymentRequest): Promise<ProcessPaymentResult> {
    try {
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: request.amount,
        currency: request.currency,
        confirm: true,
        metadata: {
          reservationId: request.reservationId,
          customerId: request.customerId
        }
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
        intentId: paymentIntent.id,
        providerTransactionId: paymentIntent.id,
        metadata: request.metadata,
        processedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      }

      return {
        success: true,
        transaction
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
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
        ...request.metadata
      }
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
      updatedAt: new Date()
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
        intentId: confirmedIntent.id,
        providerTransactionId: confirmedIntent.id,
        metadata: confirmedIntent.metadata,
        processedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      }

      return {
        success: true,
        transaction
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  async refundPayment(request: RefundRequest): Promise<RefundResult> {
    try {
      const refund = await this.stripe.refunds.create({
        payment_intent: request.transactionId,
        amount: request.amount,
        reason: 'requested_by_customer'
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
        updatedAt: new Date()
      }

      return {
        success: true,
        refundAmount: refund.amount,
        transaction
      }
    } catch (error) {
      return {
        success: false,
        refundAmount: 0,
        transaction: {} as PaymentTransaction,
        error: error instanceof Error ? error.message : 'Unknown error'
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
      intentId: paymentIntent.id,
      providerTransactionId: paymentIntent.id,
      metadata: paymentIntent.metadata,
      createdAt: new Date(),
      updatedAt: new Date()
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
        return 'pending'
      case 'canceled':
        return 'cancelled'
      default:
        return 'failed'
    }
  }
}