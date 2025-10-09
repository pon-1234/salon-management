/**
 * @design_doc   Issue #5 - Payment System Integration
 * @related_to   PaymentProvider (base class), Stripe API integration
 * @known_issues None identified
 */

import { randomUUID } from 'crypto'
import Stripe from 'stripe'
import { PaymentProvider } from './base'
import {
  PaymentIntent,
  PaymentTransaction,
  ProcessPaymentRequest,
  ProcessPaymentResult,
  RefundRequest,
  RefundResult,
} from '../types'

export interface StripeConfig {
  secretKey: string
  publishableKey: string
}

const STRIPE_API_VERSION: Stripe.LatestApiVersion = '2023-10-16'

export class StripeProvider extends PaymentProvider {
  readonly name = 'stripe'
  readonly supportedMethods = ['card']

  private stripe: Stripe | null = null
  private readonly config: StripeConfig

  constructor(config: StripeConfig) {
    super()

    if (!config.secretKey) {
      throw new Error('Stripe secret key is required')
    }

    this.config = config
  }

  private get client(): Stripe {
    if (!this.stripe) {
      this.stripe = new Stripe(this.config.secretKey, {
        apiVersion: STRIPE_API_VERSION,
        typescript: true,
      })
    }
    return this.stripe
  }

  private generateInternalId(prefix: string): string {
    return `${prefix}_${randomUUID()}`
  }

  private buildMetadata(request: ProcessPaymentRequest): Record<string, string> {
    const metadata: Record<string, string> = {
      reservationId: request.reservationId,
      customerId: request.customerId,
      paymentMethod: request.paymentMethod,
    }

    if (request.metadata) {
      for (const [key, value] of Object.entries(request.metadata)) {
        if (value !== undefined && value !== null) {
          metadata[key] = String(value)
        }
      }
    }

    return metadata
  }

  private buildTransactionFromIntent(
    intent: Stripe.Response<Stripe.PaymentIntent>,
    overrides: Partial<PaymentTransaction> = {}
  ): PaymentTransaction {
    const metadata = intent.metadata || {}
    const now = new Date()

    return {
      id: overrides.id || this.generateInternalId('txn'),
      reservationId: overrides.reservationId || (metadata.reservationId ?? ''),
      customerId: overrides.customerId || (metadata.customerId ?? ''),
      amount: overrides.amount || intent.amount,
      currency: overrides.currency || intent.currency,
      provider: 'stripe',
      paymentMethod: overrides.paymentMethod || (metadata.paymentMethod as any) || 'card',
      status: overrides.status || this.mapStripeStatusToPaymentStatus(intent.status),
      paymentIntentId: intent.id,
      stripePaymentId: intent.id,
      metadata: { ...metadata },
      processedAt: overrides.processedAt || now,
      refundedAt: overrides.refundedAt,
      refundAmount: overrides.refundAmount,
      createdAt: overrides.createdAt || now,
      updatedAt: overrides.updatedAt || now,
      errorMessage: overrides.errorMessage,
    }
  }

  async processPayment(request: ProcessPaymentRequest): Promise<ProcessPaymentResult> {
    try {
      const metadata = this.buildMetadata(request)
      const intent = await this.client.paymentIntents.create({
        amount: request.amount,
        currency: request.currency,
        confirm: true,
        metadata,
      })

      const transaction = this.buildTransactionFromIntent(intent, {
        reservationId: request.reservationId,
        customerId: request.customerId,
        paymentMethod: request.paymentMethod,
        metadata,
      })

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
    const metadata = this.buildMetadata(request)
    const stripeIntent = await this.client.paymentIntents.create({
      amount: request.amount,
      currency: request.currency,
      metadata,
    })

    const now = new Date()

    return {
      id: this.generateInternalId('pi'),
      providerId: stripeIntent.id,
      provider: 'stripe',
      amount: stripeIntent.amount,
      currency: stripeIntent.currency,
      status: this.mapStripeStatusToPaymentStatus(stripeIntent.status),
      paymentMethod: request.paymentMethod,
      reservationId: request.reservationId,
      customerId: request.customerId,
      metadata,
      clientSecret: stripeIntent.client_secret || undefined,
      createdAt: now,
      updatedAt: now,
    }
  }

  async confirmPaymentIntent(intentId: string): Promise<ProcessPaymentResult> {
    try {
      const intent = await this.client.paymentIntents.confirm(intentId)
      const transaction = this.buildTransactionFromIntent(intent)

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
      const intentId = request.providerPaymentId || request.transactionId
      const paymentIntent = await this.client.paymentIntents.retrieve(intentId)
      const refund = await this.client.refunds.create({
        payment_intent: paymentIntent.id,
        amount: request.amount,
        reason: request.reason || 'requested_by_customer',
      })

      const transaction = this.buildTransactionFromIntent(paymentIntent, {
        id: request.transactionId || this.generateInternalId('txn_refund'),
        status: 'refunded',
        refundAmount: refund.amount ?? request.amount,
        refundedAt: new Date(),
      })

      transaction.metadata = {
        ...(paymentIntent.metadata || {}),
        refundId: refund.id,
      }

      return {
        success: true,
        refundAmount: refund.amount ?? request.amount,
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
    const intent = await this.client.paymentIntents.retrieve(transactionId)
    return this.buildTransactionFromIntent(intent, { id: transactionId })
  }

  async validateConfig(): Promise<boolean> {
    return Boolean(this.config.secretKey)
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
