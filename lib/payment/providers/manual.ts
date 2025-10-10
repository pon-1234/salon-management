/**
 * @design_doc   Manual (offline) payment provider
 * @related_to   PaymentService, PaymentTransaction persistence
 * @known_issues No external side effects (purely internal bookkeeping)
 */

import { randomUUID } from 'crypto'
import { PaymentProvider } from './base'
import {
  PaymentIntent,
  PaymentTransaction,
  ProcessPaymentRequest,
  ProcessPaymentResult,
  RefundRequest,
  RefundResult,
} from '../types'

const SUPPORTED_METHODS = ['card', 'bank_transfer', 'cash'] as const

export class ManualPaymentProvider extends PaymentProvider {
  readonly name = 'manual'
  readonly supportedMethods = [...SUPPORTED_METHODS]

  private intents = new Map<string, PaymentIntent>()
  private transactions = new Map<string, PaymentTransaction>()

  private now() {
    return new Date()
  }

  private buildTransaction(
    request: ProcessPaymentRequest,
    overrides: Partial<PaymentTransaction> = {}
  ): PaymentTransaction {
    const timestamp = this.now()

    return {
      id: overrides.id || `txn_manual_${randomUUID()}`,
      reservationId: overrides.reservationId || request.reservationId,
      customerId: overrides.customerId || request.customerId,
      amount: overrides.amount ?? request.amount,
      currency: overrides.currency || request.currency,
      provider: 'manual',
      paymentMethod: overrides.paymentMethod || request.paymentMethod,
      status: overrides.status || 'completed',
      paymentIntentId: overrides.paymentIntentId,
      stripePaymentId: undefined,
      metadata: overrides.metadata || request.metadata,
      processedAt: overrides.processedAt || timestamp,
      refundedAt: overrides.refundedAt,
      refundAmount: overrides.refundAmount,
      errorMessage: overrides.errorMessage,
      createdAt: overrides.createdAt || timestamp,
      updatedAt: overrides.updatedAt || timestamp,
    }
  }

  private buildIntent(
    request: ProcessPaymentRequest,
    overrides: Partial<PaymentIntent> = {}
  ): PaymentIntent {
    const timestamp = this.now()
    return {
      id: overrides.id || `pi_manual_${randomUUID()}`,
      providerId: overrides.providerId || `manual_intent_${randomUUID()}`,
      provider: 'manual',
      amount: overrides.amount ?? request.amount,
      currency: overrides.currency || request.currency,
      status: overrides.status || 'pending',
      paymentMethod: overrides.paymentMethod || request.paymentMethod,
      reservationId: overrides.reservationId || request.reservationId,
      customerId: overrides.customerId || request.customerId,
      metadata: overrides.metadata || request.metadata,
      clientSecret: overrides.clientSecret || undefined,
      errorMessage: overrides.errorMessage,
      processedAt: overrides.processedAt,
      createdAt: overrides.createdAt || timestamp,
      updatedAt: overrides.updatedAt || timestamp,
    }
  }

  async processPayment(request: ProcessPaymentRequest): Promise<ProcessPaymentResult> {
    const transaction = this.buildTransaction(request)
    this.transactions.set(transaction.id, transaction)
    return {
      success: true,
      transaction,
    }
  }

  async createPaymentIntent(request: ProcessPaymentRequest): Promise<PaymentIntent> {
    const intent = this.buildIntent(request)
    this.intents.set(intent.providerId, intent)
    return intent
  }

  async confirmPaymentIntent(intentProviderId: string): Promise<ProcessPaymentResult> {
    const intent = this.intents.get(intentProviderId)
    if (!intent) {
      return {
        success: false,
        error: 'Payment intent not found',
      }
    }

    const request: ProcessPaymentRequest = {
      reservationId: intent.reservationId || '',
      customerId: intent.customerId || '',
      amount: intent.amount,
      currency: intent.currency,
      paymentMethod: intent.paymentMethod,
      provider: 'manual',
      metadata: intent.metadata,
    }

    const transaction = this.buildTransaction(request, {
      paymentIntentId: intent.id,
      status: 'completed',
    })

    this.transactions.set(transaction.id, transaction)
    this.intents.set(intentProviderId, {
      ...intent,
      status: 'completed',
      updatedAt: this.now(),
    })

    return {
      success: true,
      transaction,
    }
  }

  async refundPayment(request: RefundRequest): Promise<RefundResult> {
    const refundAmount = request.amount ?? 0
    const originalTransactionId =
      request.metadata && typeof request.metadata === 'object'
        ? (request.metadata as Record<string, string | undefined>).originalTransactionId
        : undefined

    const baseTransaction = originalTransactionId
      ? this.transactions.get(originalTransactionId)
      : null

    const transaction = this.buildTransaction(
      baseTransaction
        ? {
            reservationId: baseTransaction.reservationId,
            customerId: baseTransaction.customerId,
            amount: baseTransaction.amount,
            currency: baseTransaction.currency,
            paymentMethod: baseTransaction.paymentMethod,
            provider: 'manual',
            metadata: baseTransaction.metadata,
          }
        : {
            reservationId: request.transactionId,
            customerId: '',
            amount: refundAmount,
            currency: 'jpy',
            paymentMethod: 'cash',
            provider: 'manual',
            metadata: request.metadata,
          },
      {
        id: request.transactionId || `txn_manual_${randomUUID()}`,
        status: 'refunded',
        refundAmount,
        refundedAt: this.now(),
      }
    )

    this.transactions.set(transaction.id, transaction)

    return {
      success: true,
      refundAmount,
      transaction,
    }
  }

  async getPaymentStatus(transactionId: string): Promise<PaymentTransaction> {
    const existing = this.transactions.get(transactionId)
    if (existing) {
      return existing
    }

    return this.buildTransaction(
      {
        reservationId: transactionId,
        customerId: '',
        amount: 0,
        currency: 'jpy',
        paymentMethod: 'cash',
        provider: 'manual',
      },
      {
        id: transactionId,
        status: 'completed',
      }
    )
  }

  async validateConfig(): Promise<boolean> {
    return true
  }
}
