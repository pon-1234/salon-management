/**
 * @design_doc   Issue #5 - Payment System Integration
 * @related_to   StripeProvider (Stripe implementation), PaymentProvider (base class)
 * @known_issues None identified
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { StripeProvider } from '../providers/stripe'
import { ProcessPaymentRequest, RefundRequest } from '../types'

// Mock Stripe module
vi.mock('stripe', () => {
  const mockStripe = {
    paymentIntents: {
      create: vi.fn().mockResolvedValue({
        id: 'pi_test123',
        status: 'succeeded',
        amount: 5000,
        currency: 'jpy',
      }),
      retrieve: vi.fn().mockResolvedValue({
        id: 'pi_test123',
        status: 'succeeded',
        amount: 5000,
        currency: 'jpy',
      }),
      confirm: vi.fn().mockResolvedValue({
        id: 'pi_test123',
        status: 'succeeded',
      }),
    },
    refunds: {
      create: vi.fn().mockResolvedValue({
        id: 'refund_test123',
        status: 'succeeded',
        amount: 5000,
      }),
    },
  }
  
  return {
    default: vi.fn().mockImplementation(() => mockStripe),
    Stripe: vi.fn().mockImplementation(() => mockStripe),
  }
})

describe('StripeProvider', () => {
  let provider: StripeProvider

  beforeEach(() => {
    provider = new StripeProvider({
      secretKey: 'sk_test_123',
      publishableKey: 'pk_test_123',
    })
  })

  describe('provider properties', () => {
    it('should have correct name and supported methods', () => {
      expect(provider.name).toBe('stripe')
      expect(provider.supportedMethods).toEqual(['card'])
    })
  })

  describe('processPayment', () => {
    it('should process card payment successfully', async () => {
      const request: ProcessPaymentRequest = {
        reservationId: 'res_123',
        customerId: 'cust_123',
        amount: 10000,
        currency: 'jpy',
        paymentMethod: 'card',
        provider: 'stripe',
      }

      const result = await provider.processPayment(request)

      expect(result.success).toBe(true)
      expect(result.transaction).toBeDefined()
      expect(result.transaction?.status).toBe('completed')
      expect(result.transaction?.amount).toBe(10000)
      expect(result.transaction?.reservationId).toBe('res_123')
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
        provider: 'stripe',
      }

      const intent = await provider.createPaymentIntent(request)

      expect(intent.id).toBeDefined()
      expect(intent.status).toBe('completed')
      expect(intent.amount).toBe(10000)
      expect(intent.provider).toBe('stripe')
    })
  })

  describe('confirmPaymentIntent', () => {
    it('should confirm payment intent successfully', async () => {
      const result = await provider.confirmPaymentIntent('pi_123')

      expect(result.success).toBe(true)
      expect(result.transaction?.status).toBe('completed')
      expect(result.transaction?.amount).toBe(10000)
    })
  })

  describe('refundPayment', () => {
    it('should process refund successfully', async () => {
      const request: RefundRequest = {
        transactionId: 'txn_123',
        amount: 5000,
        reason: 'customer request',
      }

      const result = await provider.refundPayment(request)

      expect(result.success).toBe(true)
      expect(result.refundAmount).toBe(5000)
      expect(result.transaction!.status).toBe('refunded')
    })
  })

  describe('getPaymentStatus', () => {
    it('should get payment status successfully', async () => {
      const transaction = await provider.getPaymentStatus('txn_123')

      expect(transaction.id).toBe('txn_123')
      expect(transaction.status).toBe('completed')
      expect(transaction.amount).toBe(10000)
    })
  })

  describe('validateConfig', () => {
    it('should validate configuration successfully', async () => {
      const isValid = await provider.validateConfig()
      expect(isValid).toBe(true)
    })

    it('should throw error with invalid config', () => {
      expect(() => {
        new StripeProvider({
          secretKey: '',
          publishableKey: '',
        })
      }).toThrow('Stripe secret key is required')
    })
  })
})
