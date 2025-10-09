/**
 * @design_doc   Issue #5 - Payment System Integration
 * @related_to   PaymentService (business logic), PaymentProvider (provider abstraction)
 * @known_issues None identified
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PaymentService } from '../service'
import { PaymentProvider } from '../providers/base'
import {
  ProcessPaymentRequest,
  ProcessPaymentResult,
  PaymentTransaction,
  RefundRequest,
  PaymentProviderType,
  PaymentIntent,
  PaymentMethod,
} from '../types'
import { PaymentProviderNotFoundError } from '../errors'

// Mock Prisma
// Mock logger
vi.mock('@/lib/logger', () => ({
  default: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}))

vi.mock('@/lib/generated/prisma', () => ({
  prisma: {
    paymentTransaction: {
      create: vi.fn(),
      update: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    paymentIntent: {
      create: vi.fn(),
      update: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}))

import { prisma } from '@/lib/generated/prisma'
const mockPrisma = vi.mocked(prisma)

// Mock payment provider
class MockPaymentProvider extends PaymentProvider {
  readonly name = 'mock'
  readonly supportedMethods = ['card']

  async processPayment(request: ProcessPaymentRequest): Promise<ProcessPaymentResult> {
    return {
      success: true,
      transaction: {
        id: 'txn_mock_123',
        reservationId: request.reservationId,
        customerId: request.customerId,
        amount: request.amount,
        currency: request.currency,
        provider: 'stripe' as PaymentProviderType,
        paymentMethod: request.paymentMethod,
        status: 'completed',
        paymentIntentId: 'pi_mock_123',
        stripePaymentId: 'pi_mock_123',
        metadata: request.metadata,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    }
  }

  async createPaymentIntent(request: ProcessPaymentRequest): Promise<PaymentIntent> {
    return {
      id: 'pi_mock_123',
      providerId: 'pi_123',
      provider: 'stripe' as PaymentProviderType,
      amount: request.amount,
      currency: request.currency,
      status: 'pending',
      paymentMethod: request.paymentMethod,
      reservationId: request.reservationId,
      customerId: request.customerId,
      metadata: request.metadata,
      clientSecret: 'pi_123_secret',
      createdAt: new Date(),
      updatedAt: new Date(),
    }
  }

  async confirmPaymentIntent(intentId: string): Promise<ProcessPaymentResult> {
    return {
      success: true,
      transaction: {
        id: 'txn_confirmed_123',
        reservationId: 'res_123',
        customerId: 'cust_123',
        amount: 10000,
        currency: 'jpy',
        provider: 'stripe' as PaymentProviderType,
        paymentMethod: 'card' as PaymentMethod,
        status: 'completed',
        paymentIntentId: intentId,
        stripePaymentId: intentId,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    }
  }

  async refundPayment(request: RefundRequest) {
    return {
      success: true,
      refundAmount: request.amount || 10000,
      transaction: {
        id: request.transactionId,
        reservationId: 'res_123',
        customerId: 'cust_123',
        amount: 10000,
        currency: 'jpy',
        provider: 'stripe' as PaymentProviderType,
        paymentMethod: 'card' as PaymentMethod,
        status: 'refunded' as const,
        refundedAt: new Date(),
        refundAmount: request.amount || 10000,
        paymentIntentId: request.providerPaymentId,
        stripePaymentId: request.providerPaymentId,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    }
  }

  async getPaymentStatus(transactionId: string): Promise<PaymentTransaction> {
    return {
      id: transactionId,
      reservationId: 'res_123',
      customerId: 'cust_123',
      amount: 10000,
      currency: 'jpy',
      provider: 'stripe',
      paymentMethod: 'card',
      status: 'completed' as const,
      paymentIntentId: transactionId,
      stripePaymentId: transactionId,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
  }

  async validateConfig(): Promise<boolean> {
    return true
  }
}

describe('PaymentService', () => {
  let service: PaymentService
  let mockProvider: MockPaymentProvider

  beforeEach(() => {
    vi.clearAllMocks()
    mockProvider = new MockPaymentProvider()
    service = new PaymentService({
      stripe: mockProvider,
    })

    // Setup default mock responses
    vi.mocked(mockPrisma.paymentTransaction.findMany).mockResolvedValue([])
    vi.mocked(mockPrisma.paymentTransaction.findUnique).mockResolvedValue({
      id: 'txn_123',
      reservationId: 'res_123',
      customerId: 'cust_123',
      amount: 10000,
      currency: 'jpy',
      provider: 'stripe',
      paymentMethod: 'card',
      status: 'completed',
      type: 'payment',
      paymentIntentId: 'pi_123',
      stripePaymentId: 'pi_123',
      refundedAt: null,
      refundAmount: null,
      metadata: { reservationId: 'res_123', customerId: 'cust_123' },
      processedAt: null,
      errorMessage: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    vi.mocked(mockPrisma.paymentIntent.findUnique).mockResolvedValue({
      id: 'pi_123',
      stripeIntentId: 'pi_stripe_123',
      provider: 'stripe',
      amount: 10000,
      currency: 'jpy',
      status: 'pending',
      paymentMethod: 'card',
      customerId: 'cust_123',
      metadata: { reservationId: 'res_123' },
      providerId: 'pi_stripe_123',
      errorMessage: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
  })

  describe('processPayment', () => {
    it('should process payment successfully', async () => {
      const request: ProcessPaymentRequest = {
        reservationId: 'res_123',
        customerId: 'cust_123',
        amount: 10000,
        currency: 'jpy',
        paymentMethod: 'card' as PaymentMethod,
        provider: 'stripe',
      }

      const result = await service.processPayment(request)

      expect(result.success).toBe(true)
      expect(result.transaction).toBeDefined()
      expect(result.transaction?.amount).toBe(10000)
      expect(result.transaction?.status).toBe('completed')
    })

    it('should throw error for unsupported provider', async () => {
      const request: ProcessPaymentRequest = {
        reservationId: 'res_123',
        customerId: 'cust_123',
        amount: 10000,
        currency: 'jpy',
        paymentMethod: 'card' as PaymentMethod,
        provider: 'payjp',
      }

      await expect(service.processPayment(request)).rejects.toBeInstanceOf(
        PaymentProviderNotFoundError
      )
    })
  })

  describe('createPaymentIntent', () => {
    it('should create payment intent successfully', async () => {
      const request: ProcessPaymentRequest = {
        reservationId: 'res_123',
        customerId: 'cust_123',
        amount: 10000,
        currency: 'jpy',
        paymentMethod: 'card' as PaymentMethod,
        provider: 'stripe',
      }

      const intent = await service.createPaymentIntent(request)

      expect(intent.id).toBe('pi_mock_123')
      expect(intent.amount).toBe(10000)
      expect(intent.status).toBe('pending')
      expect(intent.clientSecret).toBe('pi_123_secret')
    })

    it('should persist intent metadata and customerId', async () => {
      const request: ProcessPaymentRequest = {
        reservationId: 'res_456',
        customerId: 'cust_456',
        amount: 8000,
        currency: 'jpy',
        paymentMethod: 'card' as PaymentMethod,
        provider: 'stripe',
        metadata: { promoCode: 'WINTER' },
      }

      await service.createPaymentIntent(request)

      expect(mockPrisma.paymentIntent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            customerId: 'cust_456',
            metadata: expect.objectContaining({ promoCode: 'WINTER' }),
          }),
        })
      )
    })
  })

  describe('getPaymentHistory', () => {
    it('should retrieve payment history for customer', async () => {
      const history = await service.getPaymentHistory('cust_123')

      expect(Array.isArray(history)).toBe(true)
    })

    it('should retrieve payment history for reservation', async () => {
      const history = await service.getPaymentHistoryByReservation('res_123')

      expect(Array.isArray(history)).toBe(true)
    })
  })

  describe('refundPayment', () => {
    it('should process refund successfully', async () => {
      const request: RefundRequest = {
        transactionId: 'txn_123',
        amount: 5000,
        reason: 'customer request',
      }

      const refundSpy = vi.spyOn(mockProvider, 'refundPayment')

      const result = await service.refundPayment(request)

      expect(result.success).toBe(true)
      expect(result.refundAmount).toBe(5000)
      expect(result.transaction!.status).toBe('refunded')
      expect(refundSpy).toHaveBeenCalledWith({
        ...request,
        providerPaymentId: 'pi_123',
        metadata: { reservationId: 'res_123', customerId: 'cust_123' },
      })
    })
  })

  describe('getPaymentStatus', () => {
    it('should get payment status successfully', async () => {
      const statusSpy = vi.spyOn(mockProvider, 'getPaymentStatus')
      const transaction = await service.getPaymentStatus('txn_123')

      expect(transaction.id).toBe('pi_123')
      expect(transaction.status).toBe('completed')
      expect(statusSpy).toHaveBeenCalledWith('pi_123')
    })
  })
})
