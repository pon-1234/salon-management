/**
 * @design_doc   Issue #5 - Payment System Integration
 * @related_to   PaymentService (business logic), PaymentProvider (provider abstraction)
 * @known_issues None identified
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PaymentService } from '../service'
import { PaymentProvider } from '../providers/base'
import { ProcessPaymentRequest, ProcessPaymentResult, PaymentTransaction, RefundRequest } from '../types'

// Mock Prisma
vi.mock('@/lib/generated/prisma', () => ({
  prisma: {
    paymentTransaction: {
      create: vi.fn(),
      update: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn()
    },
    paymentIntent: {
      create: vi.fn(),
      update: vi.fn(),
      findUnique: vi.fn()
    }
  }
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
        provider: 'stripe',
        paymentMethod: request.paymentMethod,
        status: 'completed',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    }
  }

  async createPaymentIntent(request: ProcessPaymentRequest) {
    return {
      id: 'pi_mock_123',
      providerId: 'pi_123',
      provider: 'stripe',
      amount: request.amount,
      currency: request.currency,
      status: 'pending' as const,
      paymentMethod: request.paymentMethod,
      clientSecret: 'pi_123_secret',
      createdAt: new Date(),
      updatedAt: new Date()
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
        provider: 'stripe',
        paymentMethod: 'card',
        status: 'completed',
        createdAt: new Date(),
        updatedAt: new Date()
      }
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
        provider: 'stripe',
        paymentMethod: 'card',
        status: 'refunded' as const,
        refundedAt: new Date(),
        refundAmount: request.amount || 10000,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    }
  }

  async getPaymentStatus(transactionId: string) {
    return {
      id: transactionId,
      reservationId: 'res_123',
      customerId: 'cust_123',
      amount: 10000,
      currency: 'jpy',
      provider: 'stripe',
      paymentMethod: 'card',
      status: 'completed' as const,
      createdAt: new Date(),
      updatedAt: new Date()
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
      stripe: mockProvider
    })
    
    // Setup default mock responses
    mockPrisma.paymentTransaction.findMany.mockResolvedValue([])
    mockPrisma.paymentTransaction.findUnique.mockResolvedValue({
      id: 'txn_123',
      reservationId: 'res_123',
      customerId: 'cust_123',
      amount: 10000,
      currency: 'jpy',
      provider: 'stripe',
      paymentMethod: 'card',
      status: 'completed',
      createdAt: new Date(),
      updatedAt: new Date()
    })
    mockPrisma.paymentIntent.findUnique.mockResolvedValue({
      id: 'pi_123',
      providerId: 'pi_stripe_123',
      provider: 'stripe',
      amount: 10000,
      currency: 'jpy',
      status: 'pending',
      paymentMethod: 'card',
      createdAt: new Date(),
      updatedAt: new Date()
    })
  })

  describe('processPayment', () => {
    it('should process payment successfully', async () => {
      const request: ProcessPaymentRequest = {
        reservationId: 'res_123',
        customerId: 'cust_123',
        amount: 10000,
        currency: 'jpy',
        paymentMethod: 'card',
        provider: 'stripe'
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
        paymentMethod: 'card',
        provider: 'payjp'
      }

      await expect(service.processPayment(request)).rejects.toThrow('Payment provider payjp not supported')
    })
  })

  describe('createPaymentIntent', () => {
    it('should create payment intent successfully', async () => {
      const request: ProcessPaymentRequest = {
        reservationId: 'res_123',
        customerId: 'cust_123',
        amount: 10000,
        currency: 'jpy',
        paymentMethod: 'card',
        provider: 'stripe'
      }

      const intent = await service.createPaymentIntent(request)

      expect(intent.id).toBe('pi_mock_123')
      expect(intent.amount).toBe(10000)
      expect(intent.status).toBe('pending')
      expect(intent.clientSecret).toBe('pi_123_secret')
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
        reason: 'customer request'
      }

      const result = await service.refundPayment(request)

      expect(result.success).toBe(true)
      expect(result.refundAmount).toBe(5000)
      expect(result.transaction.status).toBe('refunded')
    })
  })

  describe('getPaymentStatus', () => {
    it('should get payment status successfully', async () => {
      const transaction = await service.getPaymentStatus('txn_123')

      expect(transaction.id).toBe('txn_123')
      expect(transaction.status).toBe('completed')
    })
  })
})