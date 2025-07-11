/**
 * @design_doc   Issue #5 - Payment System Integration
 * @related_to   Payment API endpoints, PaymentService (business logic)
 * @known_issues None identified
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST, GET } from '../route'
import { NextRequest } from 'next/server'

// Mock PaymentService
vi.mock('@/lib/payment/service', () => ({
  PaymentService: vi.fn().mockImplementation(() => ({
    processPayment: vi.fn(),
    createPaymentIntent: vi.fn(),
    getPaymentHistory: vi.fn(),
    getPaymentHistoryByReservation: vi.fn(),
    refundPayment: vi.fn(),
    getPaymentStatus: vi.fn(),
  })),
}))

const mockPaymentService = {
  processPayment: vi.fn(),
  createPaymentIntent: vi.fn(),
  getPaymentHistory: vi.fn(),
  getPaymentHistoryByReservation: vi.fn(),
  refundPayment: vi.fn(),
  getPaymentStatus: vi.fn(),
}

describe('/api/payments', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('POST /api/payments', () => {
    it('should process payment successfully', async () => {
      const paymentData = {
        reservationId: 'res_123',
        customerId: 'cust_123',
        amount: 10000,
        currency: 'jpy',
        paymentMethod: 'card',
        provider: 'stripe',
      }

      mockPaymentService.processPayment.mockResolvedValue({
        success: true,
        transaction: {
          id: 'txn_123',
          ...paymentData,
          status: 'completed',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      })

      const request = new NextRequest('http://localhost:3000/api/payments', {
        method: 'POST',
        body: JSON.stringify(paymentData),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.transaction).toBeDefined()
      expect(mockPaymentService.processPayment).toHaveBeenCalledWith(paymentData)
    })

    it('should return 400 for invalid payment data', async () => {
      const invalidData = {
        reservationId: 'res_123',
        // missing required fields
      }

      const request = new NextRequest('http://localhost:3000/api/payments', {
        method: 'POST',
        body: JSON.stringify(invalidData),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBeDefined()
    })

    it('should handle payment processing failure', async () => {
      const paymentData = {
        reservationId: 'res_123',
        customerId: 'cust_123',
        amount: 10000,
        currency: 'jpy',
        paymentMethod: 'card',
        provider: 'stripe',
      }

      mockPaymentService.processPayment.mockResolvedValue({
        success: false,
        error: 'Card declined',
      })

      const request = new NextRequest('http://localhost:3000/api/payments', {
        method: 'POST',
        body: JSON.stringify(paymentData),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Card declined')
    })
  })

  describe('GET /api/payments', () => {
    it('should get payment history by customerId', async () => {
      const mockTransactions = [
        {
          id: 'txn_123',
          reservationId: 'res_123',
          customerId: 'cust_123',
          amount: 10000,
          status: 'completed',
        },
      ]

      mockPaymentService.getPaymentHistory.mockResolvedValue(mockTransactions)

      const request = new NextRequest('http://localhost:3000/api/payments?customerId=cust_123')

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.transactions).toEqual(mockTransactions)
      expect(mockPaymentService.getPaymentHistory).toHaveBeenCalledWith('cust_123')
    })

    it('should get payment history by reservationId', async () => {
      const mockTransactions = [
        {
          id: 'txn_123',
          reservationId: 'res_123',
          customerId: 'cust_123',
          amount: 10000,
          status: 'completed',
        },
      ]

      mockPaymentService.getPaymentHistoryByReservation.mockResolvedValue(mockTransactions)

      const request = new NextRequest('http://localhost:3000/api/payments?reservationId=res_123')

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.transactions).toEqual(mockTransactions)
      expect(mockPaymentService.getPaymentHistoryByReservation).toHaveBeenCalledWith('res_123')
    })

    it('should return 400 when no query parameters provided', async () => {
      const request = new NextRequest('http://localhost:3000/api/payments')

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('customerId or reservationId is required')
    })
  })
})
