/**
 * @design_doc   Issue #5 - Payment System Integration
 * @related_to   PaymentProvider (abstract base class)
 * @known_issues None identified
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PaymentProvider } from '../providers/base'
import {
  ProcessPaymentRequest,
  ProcessPaymentResult,
  PaymentIntent,
  RefundRequest,
  RefundResult,
  PaymentTransaction,
} from '../types'

// Mock implementation for testing
class TestPaymentProvider extends PaymentProvider {
  readonly name = 'test'
  readonly supportedMethods = ['card', 'bank_transfer']

  async processPayment(request: ProcessPaymentRequest): Promise<ProcessPaymentResult> {
    throw new Error('Not implemented')
  }

  async createPaymentIntent(request: ProcessPaymentRequest): Promise<PaymentIntent> {
    throw new Error('Not implemented')
  }

  async confirmPaymentIntent(intentId: string): Promise<ProcessPaymentResult> {
    throw new Error('Not implemented')
  }

  async refundPayment(request: RefundRequest): Promise<RefundResult> {
    throw new Error('Not implemented')
  }

  async getPaymentStatus(transactionId: string): Promise<PaymentTransaction> {
    throw new Error('Not implemented')
  }

  async validateConfig(): Promise<boolean> {
    throw new Error('Not implemented')
  }
}

describe('PaymentProvider', () => {
  let provider: TestPaymentProvider

  beforeEach(() => {
    provider = new TestPaymentProvider()
  })

  describe('abstract methods', () => {
    it('should have required properties', () => {
      expect(provider.name).toBe('test')
      expect(provider.supportedMethods).toEqual(['card', 'bank_transfer'])
    })

    it('should throw error for processPayment when not implemented', async () => {
      const request: ProcessPaymentRequest = {
        reservationId: 'res_123',
        customerId: 'cust_123',
        amount: 10000,
        currency: 'jpy',
        paymentMethod: 'card',
        provider: 'manual',
      }

      await expect(provider.processPayment(request)).rejects.toThrow('Not implemented')
    })

    it('should throw error for createPaymentIntent when not implemented', async () => {
      const request: ProcessPaymentRequest = {
        reservationId: 'res_123',
        customerId: 'cust_123',
        amount: 10000,
        currency: 'jpy',
        paymentMethod: 'card',
        provider: 'manual',
      }

      await expect(provider.createPaymentIntent(request)).rejects.toThrow('Not implemented')
    })

    it('should throw error for confirmPaymentIntent when not implemented', async () => {
      await expect(provider.confirmPaymentIntent('intent_123')).rejects.toThrow('Not implemented')
    })

    it('should throw error for refundPayment when not implemented', async () => {
      const request: RefundRequest = {
        transactionId: 'txn_123',
        amount: 5000,
        reason: 'customer request',
      }

      await expect(provider.refundPayment(request)).rejects.toThrow('Not implemented')
    })

    it('should throw error for getPaymentStatus when not implemented', async () => {
      await expect(provider.getPaymentStatus('txn_123')).rejects.toThrow('Not implemented')
    })

    it('should throw error for validateConfig when not implemented', async () => {
      await expect(provider.validateConfig()).rejects.toThrow('Not implemented')
    })
  })
})
