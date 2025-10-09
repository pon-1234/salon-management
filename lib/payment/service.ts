/**
 * @design_doc   Issue #5 - Payment System Integration
 * @related_to   PaymentProvider (provider abstraction), PaymentTransaction (data models)
 * @known_issues None identified
 */

import { PaymentProvider } from './providers/base'
import {
  PaymentTransaction,
  ProcessPaymentRequest,
  ProcessPaymentResult,
  PaymentIntent,
  RefundRequest,
  RefundResult,
} from './types'
import { prisma } from '@/lib/generated/prisma'
import logger from '@/lib/logger'
import { validatePaymentRequest, sanitizeMetadata } from './validators'
import { PaymentProviderNotFoundError } from './errors'

export class PaymentService {
  private providers: Record<string, PaymentProvider>

  constructor(providers: Record<string, PaymentProvider>) {
    this.providers = providers
  }

  async processPayment(request: ProcessPaymentRequest): Promise<ProcessPaymentResult> {
    const startTime = Date.now()
    const { provider: providerName, amount, customerId, reservationId } = request

    // Validate request
    const validation = validatePaymentRequest(request)
    if (!validation.valid) {
      const error = `Payment validation failed: ${validation.errors.join(', ')}`
      logger.error({ validationErrors: validation.errors }, error)
      return {
        success: false,
        error,
      }
    }

    // Sanitize metadata
    const sanitizedRequest = {
      ...request,
      metadata: sanitizeMetadata(request.metadata),
    }

    logger.info(
      {
        action: 'process_payment_start',
        provider: providerName,
        amount,
        customerId,
        reservationId,
      },
      'Starting payment processing'
    )

    const provider = this.getProvider(providerName)

    try {
      const result = await provider.processPayment(sanitizedRequest)

      if (result.success && result.transaction) {
        // Save transaction to database
        await this.saveTransaction(result.transaction)

        const duration = Date.now() - startTime
        logger.info(
          {
            action: 'process_payment_success',
            provider: providerName,
            amount,
            transactionId: result.transaction.id,
            duration,
          },
          'Payment processed successfully'
        )
      } else {
        logger.warn(
          {
            action: 'process_payment_failed',
            provider: providerName,
            amount,
            error: result.error,
            duration: Date.now() - startTime,
          },
          'Payment processing failed'
        )
      }

      return result
    } catch (error) {
      const duration = Date.now() - startTime
      logger.error(
        {
          action: 'process_payment_error',
          provider: providerName,
          amount,
          error: error instanceof Error ? error.message : 'Unknown error',
          duration,
        },
        'Payment processing error'
      )
      throw error
    }
  }

  async createPaymentIntent(request: ProcessPaymentRequest): Promise<PaymentIntent> {
    const provider = this.getProvider(request.provider)

    const intent = await provider.createPaymentIntent(request)

    // Save intent to database
    await this.saveIntent(intent)

    return intent
  }

  async confirmPaymentIntent(intentId: string): Promise<ProcessPaymentResult> {
    // Get intent from database to determine provider
    const intent = await this.getIntent(intentId)
    if (!intent) {
      throw new Error(`Payment intent ${intentId} not found`)
    }

    const provider = this.getProvider(intent.provider)

    const result = await provider.confirmPaymentIntent(intent.providerId)

    if (result.success && result.transaction) {
      // Save transaction to database
      await this.saveTransaction(result.transaction)

      // Update intent status
      await this.updateIntent(intentId, { status: 'completed' })
    }

    return result
  }

  async refundPayment(request: RefundRequest): Promise<RefundResult> {
    const startTime = Date.now()
    const { transactionId, amount, reason } = request

    logger.info(
      {
        action: 'refund_payment_start',
        transactionId,
        amount,
        reason,
      },
      'Starting refund processing'
    )

    try {
      // Get transaction from database to determine provider
      const transaction = await this.getTransaction(transactionId)
      if (!transaction) {
        const error = `Transaction ${transactionId} not found`
        logger.error({ transactionId }, error)
        throw new Error(error)
      }

      const provider = this.getProvider(transaction.provider)
      const providerPaymentId =
        transaction.stripePaymentId || transaction.paymentIntentId || transaction.id

      const providerRequest: RefundRequest = {
        ...request,
        providerPaymentId,
        metadata: transaction.metadata || undefined,
      }

      const result = await provider.refundPayment(providerRequest)

      if (result.success) {
        // Update transaction in database
        await this.updateTransaction(transactionId, {
          status: 'refunded',
          refundedAt: new Date(),
          refundAmount: result.refundAmount,
        })

        const duration = Date.now() - startTime
        logger.info(
          {
            action: 'refund_payment_success',
            transactionId,
            refundAmount: result.refundAmount,
            duration,
          },
          'Refund processed successfully'
        )
      } else {
        logger.warn(
          {
            action: 'refund_payment_failed',
            transactionId,
            error: result.error,
            duration: Date.now() - startTime,
          },
          'Refund processing failed'
        )
      }

      return result
    } catch (error) {
      const duration = Date.now() - startTime
      logger.error(
        {
          action: 'refund_payment_error',
          transactionId,
          error: error instanceof Error ? error.message : 'Unknown error',
          duration,
        },
        'Refund processing error'
      )
      throw error
    }
  }

  async getPaymentStatus(transactionId: string): Promise<PaymentTransaction> {
    // Get transaction from database to determine provider
    const transaction = await this.getTransaction(transactionId)
    if (!transaction) {
      throw new Error(`Transaction ${transactionId} not found`)
    }

    const provider = this.getProvider(transaction.provider)
    const providerTransactionId =
      transaction.stripePaymentId || transaction.paymentIntentId || transaction.id

    return provider.getPaymentStatus(providerTransactionId)
  }

  async getPaymentHistory(customerId: string): Promise<PaymentTransaction[]> {
    const transactions = await prisma.paymentTransaction.findMany({
      where: { customerId },
      orderBy: { createdAt: 'desc' },
    })
    return transactions as PaymentTransaction[]
  }

  async getPaymentHistoryByReservation(reservationId: string): Promise<PaymentTransaction[]> {
    const transactions = await prisma.paymentTransaction.findMany({
      where: { reservationId },
      orderBy: { createdAt: 'desc' },
    })
    return transactions as PaymentTransaction[]
  }

  private async saveTransaction(transaction: PaymentTransaction): Promise<void> {
    try {
      await prisma.paymentTransaction.create({
        data: {
          id: transaction.id,
          reservationId: transaction.reservationId,
          customerId: transaction.customerId,
          amount: transaction.amount,
          currency: transaction.currency,
          provider: transaction.provider,
          paymentMethod: transaction.paymentMethod,
          status: transaction.status,
          type: 'payment',
          paymentIntentId: transaction.paymentIntentId,
          stripePaymentId: transaction.stripePaymentId,
          metadata: transaction.metadata,
          errorMessage: transaction.errorMessage,
          processedAt: transaction.processedAt,
          refundedAt: transaction.refundedAt,
          refundAmount: transaction.refundAmount,
        },
      })

      logger.debug(
        {
          action: 'save_transaction',
          transactionId: transaction.id,
          status: transaction.status,
        },
        'Transaction saved to database'
      )
    } catch (error) {
      logger.error(
        {
          action: 'save_transaction_error',
          transactionId: transaction.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        'Failed to save transaction'
      )
      throw error
    }
  }

  private async saveIntent(intent: PaymentIntent): Promise<void> {
    await prisma.paymentIntent.create({
      data: {
        id: intent.id,
        stripeIntentId: intent.providerId, // Use providerId as stripeIntentId
        providerId: intent.providerId,
        provider: intent.provider,
        amount: intent.amount,
        currency: intent.currency,
        status: intent.status,
        paymentMethod: intent.paymentMethod,
        customerId: intent.customerId,
        metadata: intent.metadata,
        errorMessage: intent.errorMessage,
      },
    })
  }

  private getProvider(providerName: string): PaymentProvider {
    const provider = this.providers[providerName]
    if (!provider) {
      logger.error({ provider: providerName }, 'Payment provider not configured')
      throw new PaymentProviderNotFoundError(providerName)
    }
    return provider
  }

  private async getIntent(intentId: string): Promise<PaymentIntent | null> {
    const intent = await prisma.paymentIntent.findUnique({
      where: { id: intentId },
    })
    return intent as PaymentIntent | null
  }

  private async updateIntent(intentId: string, data: Partial<PaymentIntent>): Promise<void> {
    await prisma.paymentIntent.update({
      where: { id: intentId },
      data: {
        status: data.status,
        errorMessage: data.errorMessage,
      },
    })
  }

  private async getTransaction(transactionId: string): Promise<PaymentTransaction | null> {
    const transaction = await prisma.paymentTransaction.findUnique({
      where: { id: transactionId },
    })
    return transaction as PaymentTransaction | null
  }

  private async updateTransaction(
    transactionId: string,
    data: Partial<PaymentTransaction>
  ): Promise<void> {
    await prisma.paymentTransaction.update({
      where: { id: transactionId },
      data: {
        status: data.status,
        errorMessage: data.errorMessage,
        processedAt: data.processedAt,
        refundedAt: data.refundedAt,
        refundAmount: data.refundAmount,
      },
    })
  }
}
