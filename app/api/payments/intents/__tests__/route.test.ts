/**
 * @design_doc   Issue #5 - Payment System Integration
 * @related_to   Payment Intent API endpoints, PaymentService (business logic)
 * @known_issues None identified
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Set up environment variables before importing route
process.env.STRIPE_SECRET_KEY = 'sk_test_dummy'
process.env.STRIPE_PUBLISHABLE_KEY = 'pk_test_dummy'

// Mock StripeProvider before importing route
vi.mock('@/lib/payment/providers/stripe', () => ({
  StripeProvider: vi.fn().mockImplementation(() => ({
    name: 'stripe',
    supportedMethods: ['card'],
    processPayment: vi.fn(),
    createPaymentIntent: vi.fn(),
    confirmPaymentIntent: vi.fn(),
    refundPayment: vi.fn(),
    getPaymentStatus: vi.fn(),
    validateConfig: vi.fn(),
  })),
}))

// Mock PaymentService
vi.mock('@/lib/payment/service', () => ({
  PaymentService: vi.fn().mockImplementation(() => ({
    createPaymentIntent: vi.fn(),
    confirmPaymentIntent: vi.fn(),
  })),
}))

// Import route after mocks are set up
const { POST, PATCH } = await import('../route')

const mockPaymentService = {
  createPaymentIntent: vi.fn(),
  confirmPaymentIntent: vi.fn(),
}

describe('/api/payments/intents', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('POST /api/payments/intents', () => {
    it('should create payment intent successfully', async () => {
      const intentData = {
        reservationId: 'res_123',
        customerId: 'cust_123',
        amount: 10000,
        currency: 'jpy',
        paymentMethod: 'card',
        provider: 'stripe',
      }

      const mockIntent = {
        id: 'pi_123',
        providerId: 'pi_stripe_123',
        provider: 'stripe',
        amount: 10000,
        currency: 'jpy',
        status: 'pending',
        paymentMethod: 'card',
        clientSecret: 'pi_123_secret',
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockPaymentService.createPaymentIntent.mockResolvedValue(mockIntent)

      const request = new NextRequest('http://localhost:3000/api/payments/intents', {
        method: 'POST',
        body: JSON.stringify(intentData),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.intent).toEqual(mockIntent)
      expect(mockPaymentService.createPaymentIntent).toHaveBeenCalledWith(intentData)
    })

    it('should return 400 for invalid intent data', async () => {
      const invalidData = {
        reservationId: 'res_123',
        // missing required fields
      }

      const request = new NextRequest('http://localhost:3000/api/payments/intents', {
        method: 'POST',
        body: JSON.stringify(invalidData),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBeDefined()
    })

    it('should handle intent creation failure', async () => {
      const intentData = {
        reservationId: 'res_123',
        customerId: 'cust_123',
        amount: 10000,
        currency: 'jpy',
        paymentMethod: 'card',
        provider: 'stripe',
      }

      mockPaymentService.createPaymentIntent.mockRejectedValue(new Error('Provider error'))

      const request = new NextRequest('http://localhost:3000/api/payments/intents', {
        method: 'POST',
        body: JSON.stringify(intentData),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Provider error')
    })
  })

  describe('PATCH /api/payments/intents', () => {
    it('should confirm payment intent successfully', async () => {
      const confirmData = {
        intentId: 'pi_123',
      }

      const mockResult = {
        success: true,
        transaction: {
          id: 'txn_123',
          reservationId: 'res_123',
          customerId: 'cust_123',
          amount: 10000,
          currency: 'jpy',
          provider: 'stripe',
          paymentMethod: 'card',
          status: 'completed',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      }

      mockPaymentService.confirmPaymentIntent.mockResolvedValue(mockResult)

      const request = new NextRequest('http://localhost:3000/api/payments/intents', {
        method: 'PATCH',
        body: JSON.stringify(confirmData),
      })

      const response = await PATCH(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.transaction).toBeDefined()
      expect(mockPaymentService.confirmPaymentIntent).toHaveBeenCalledWith('pi_123')
    })

    it('should return 400 for missing intentId', async () => {
      const request = new NextRequest('http://localhost:3000/api/payments/intents', {
        method: 'PATCH',
        body: JSON.stringify({}),
      })

      const response = await PATCH(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('intentId is required')
    })

    it('should handle confirmation failure', async () => {
      const confirmData = {
        intentId: 'pi_123',
      }

      mockPaymentService.confirmPaymentIntent.mockResolvedValue({
        success: false,
        error: 'Payment failed',
      })

      const request = new NextRequest('http://localhost:3000/api/payments/intents', {
        method: 'PATCH',
        body: JSON.stringify(confirmData),
      })

      const response = await PATCH(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Payment failed')
    })
  })
})
