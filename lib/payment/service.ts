/**
 * @design_doc   Issue #5 - Payment System Integration
 * @related_to   PaymentProvider (provider abstraction), PaymentTransaction (data models)
 * @known_issues None identified
 */

import { PaymentProvider } from './providers/base'
import { PaymentTransaction, ProcessPaymentRequest, ProcessPaymentResult, PaymentIntent, RefundRequest, RefundResult } from './types'
import { prisma } from '@/lib/generated/prisma'

export class PaymentService {
  private providers: Record<string, PaymentProvider>

  constructor(providers: Record<string, PaymentProvider>) {
    this.providers = providers
  }

  async processPayment(request: ProcessPaymentRequest): Promise<ProcessPaymentResult> {
    const provider = this.providers[request.provider]
    if (!provider) {
      throw new Error(`Payment provider ${request.provider} not supported`)
    }

    const result = await provider.processPayment(request)
    
    if (result.success && result.transaction) {
      // Save transaction to database
      await this.saveTransaction(result.transaction)
    }

    return result
  }

  async createPaymentIntent(request: ProcessPaymentRequest): Promise<PaymentIntent> {
    const provider = this.providers[request.provider]
    if (!provider) {
      throw new Error(`Payment provider ${request.provider} not supported`)
    }

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

    const provider = this.providers[intent.provider]
    if (!provider) {
      throw new Error(`Payment provider ${intent.provider} not supported`)
    }

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
    // Get transaction from database to determine provider
    const transaction = await this.getTransaction(request.transactionId)
    if (!transaction) {
      throw new Error(`Transaction ${request.transactionId} not found`)
    }

    const provider = this.providers[transaction.provider]
    if (!provider) {
      throw new Error(`Payment provider ${transaction.provider} not supported`)
    }

    const result = await provider.refundPayment(request)
    
    if (result.success) {
      // Update transaction in database
      await this.updateTransaction(request.transactionId, {
        status: 'refunded',
        refundedAt: new Date(),
        refundAmount: result.refundAmount
      })
    }

    return result
  }

  async getPaymentStatus(transactionId: string): Promise<PaymentTransaction> {
    // Get transaction from database to determine provider
    const transaction = await this.getTransaction(transactionId)
    if (!transaction) {
      throw new Error(`Transaction ${transactionId} not found`)
    }

    const provider = this.providers[transaction.provider]
    if (!provider) {
      throw new Error(`Payment provider ${transaction.provider} not supported`)
    }

    return provider.getPaymentStatus(transactionId)
  }

  async getPaymentHistory(customerId: string): Promise<PaymentTransaction[]> {
    const transactions = await prisma.paymentTransaction.findMany({
      where: { customerId },
      orderBy: { createdAt: 'desc' }
    })
    return transactions as PaymentTransaction[]
  }

  async getPaymentHistoryByReservation(reservationId: string): Promise<PaymentTransaction[]> {
    const transactions = await prisma.paymentTransaction.findMany({
      where: { reservationId },
      orderBy: { createdAt: 'desc' }
    })
    return transactions as PaymentTransaction[]
  }

  private async saveTransaction(transaction: PaymentTransaction): Promise<void> {
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
        intentId: transaction.intentId,
        providerTransactionId: transaction.providerTransactionId,
        metadata: transaction.metadata,
        errorMessage: transaction.errorMessage,
        processedAt: transaction.processedAt,
        refundedAt: transaction.refundedAt,
        refundAmount: transaction.refundAmount
      }
    })
  }

  private async saveIntent(intent: PaymentIntent): Promise<void> {
    await prisma.paymentIntent.create({ 
      data: {
        id: intent.id,
        providerId: intent.providerId,
        provider: intent.provider,
        amount: intent.amount,
        currency: intent.currency,
        status: intent.status,
        paymentMethod: intent.paymentMethod,
        clientSecret: intent.clientSecret,
        metadata: intent.metadata,
        errorMessage: intent.errorMessage,
        processedAt: intent.processedAt
      }
    })
  }

  private async getIntent(intentId: string): Promise<PaymentIntent | null> {
    const intent = await prisma.paymentIntent.findUnique({
      where: { id: intentId }
    })
    return intent as PaymentIntent | null
  }

  private async updateIntent(intentId: string, data: Partial<PaymentIntent>): Promise<void> {
    await prisma.paymentIntent.update({ 
      where: { id: intentId }, 
      data: {
        status: data.status,
        errorMessage: data.errorMessage,
        processedAt: data.processedAt
      }
    })
  }

  private async getTransaction(transactionId: string): Promise<PaymentTransaction | null> {
    const transaction = await prisma.paymentTransaction.findUnique({
      where: { id: transactionId }
    })
    return transaction as PaymentTransaction | null
  }

  private async updateTransaction(transactionId: string, data: Partial<PaymentTransaction>): Promise<void> {
    await prisma.paymentTransaction.update({ 
      where: { id: transactionId }, 
      data: {
        status: data.status,
        errorMessage: data.errorMessage,
        processedAt: data.processedAt,
        refundedAt: data.refundedAt,
        refundAmount: data.refundAmount
      }
    })
  }
}