/**
 * @design_doc   Issue #5 - Payment System Integration
 * @related_to   ReservationService (business logic), PaymentService (payment processing)
 * @known_issues None identified
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ReservationService } from '../service'
import { PaymentService } from '@/lib/payment/service'

// Mock PaymentService
vi.mock('@/lib/payment/service')
const MockPaymentService = vi.mocked(PaymentService)

// Mock Prisma
vi.mock('@/lib/generated/prisma', () => ({
  prisma: {
    reservation: {
      create: vi.fn(),
      update: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    paymentTransaction: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
  },
}))

describe('Reservation-Payment Integration', () => {
  let reservationService: ReservationService
  let mockPaymentService: any

  beforeEach(() => {
    mockPaymentService = {
      processPayment: vi.fn(),
      createPaymentIntent: vi.fn(),
      getPaymentHistoryByReservation: vi.fn(),
    }
    MockPaymentService.mockImplementation(() => mockPaymentService)
    reservationService = new ReservationService(mockPaymentService)
  })

  describe('createReservationWithPayment', () => {
    it('should create reservation and process payment successfully', async () => {
      const reservationData = {
        customerId: 'cust_123',
        castId: 'cast_123',
        courseId: 'course_123',
        startTime: new Date('2024-01-01T10:00:00Z'),
        endTime: new Date('2024-01-01T11:00:00Z'),
        amount: 10000,
        paymentMethod: 'card' as const,
        paymentProvider: 'manual' as const,
      }

      const mockReservation = {
        id: 'res_123',
        customerId: 'cust_123',
        castId: 'cast_123',
        courseId: 'course_123',
        startTime: reservationData.startTime,
        endTime: reservationData.endTime,
        status: 'confirmed',
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const mockPaymentResult = {
        success: true,
        transaction: {
          id: 'txn_123',
          reservationId: 'res_123',
          customerId: 'cust_123',
          amount: 10000,
          currency: 'jpy',
          provider: 'manual',
          paymentMethod: 'card',
          status: 'completed',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      }

      mockPaymentService.processPayment.mockResolvedValue(mockPaymentResult)

      const result = await reservationService.createReservationWithPayment(reservationData)

      expect(result.success).toBe(true)
      expect(result.reservation).toBeDefined()
      expect(result.paymentResult).toBeDefined()
      expect(result.paymentResult?.success).toBe(true)
      expect(mockPaymentService.processPayment).toHaveBeenCalledWith({
        reservationId: expect.any(String),
        customerId: 'cust_123',
        amount: 10000,
        currency: 'jpy',
        paymentMethod: 'card',
        provider: 'manual',
      })
    })

    it('should handle payment failure and cancel reservation', async () => {
      const reservationData = {
        customerId: 'cust_123',
        castId: 'cast_123',
        courseId: 'course_123',
        startTime: new Date('2024-01-01T10:00:00Z'),
        endTime: new Date('2024-01-01T11:00:00Z'),
        amount: 10000,
        paymentMethod: 'card' as const,
        paymentProvider: 'manual' as const,
      }

      const mockPaymentResult = {
        success: false,
        error: 'Card declined',
      }

      mockPaymentService.processPayment.mockResolvedValue(mockPaymentResult)

      const result = await reservationService.createReservationWithPayment(reservationData)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Payment failed: Card declined')
    })
  })

  describe('createReservationWithPaymentIntent', () => {
    it('should create reservation and payment intent for client-side processing', async () => {
      const reservationData = {
        customerId: 'cust_123',
        castId: 'cast_123',
        courseId: 'course_123',
        startTime: new Date('2024-01-01T10:00:00Z'),
        endTime: new Date('2024-01-01T11:00:00Z'),
        amount: 10000,
        paymentMethod: 'card' as const,
        paymentProvider: 'manual' as const,
      }

      const mockIntent = {
        id: 'pi_123',
        providerId: 'pi_manual_123',
        provider: 'manual',
        amount: 10000,
        currency: 'jpy',
        status: 'pending',
        paymentMethod: 'card',
        clientSecret: 'pi_123_secret',
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockPaymentService.createPaymentIntent.mockResolvedValue(mockIntent)

      const result = await reservationService.createReservationWithPaymentIntent(reservationData)

      expect(result.success).toBe(true)
      expect(result.reservation).toBeDefined()
      expect(result.paymentIntent).toBeDefined()
      expect(result.paymentIntent?.clientSecret).toBe('pi_123_secret')
      expect(mockPaymentService.createPaymentIntent).toHaveBeenCalledWith({
        reservationId: expect.any(String),
        customerId: 'cust_123',
        amount: 10000,
        currency: 'jpy',
        paymentMethod: 'card',
        provider: 'manual',
      })
    })
  })

  describe('getReservationWithPayments', () => {
    it('should get reservation with payment history', async () => {
      const reservationId = 'res_123'

      const mockPayments = [
        {
          id: 'txn_123',
          reservationId: 'res_123',
          customerId: 'cust_123',
          amount: 10000,
          currency: 'jpy',
          provider: 'manual',
          paymentMethod: 'card',
          status: 'completed',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]

      mockPaymentService.getPaymentHistoryByReservation.mockResolvedValue(mockPayments)

      const result = await reservationService.getReservationWithPayments(reservationId)

      expect(result.reservation).toBeDefined()
      expect(result.payments).toEqual(mockPayments)
      expect(mockPaymentService.getPaymentHistoryByReservation).toHaveBeenCalledWith(reservationId)
    })
  })

  describe('cancelReservationWithRefund', () => {
    it('should cancel reservation and process refund', async () => {
      const reservationId = 'res_123'
      const refundAmount = 5000

      // Mock payment history to return a completed payment
      const mockPayments = [
        {
          id: 'txn_123',
          reservationId: 'res_123',
          customerId: 'cust_123',
          amount: 10000,
          currency: 'jpy',
          provider: 'manual',
          paymentMethod: 'card',
          status: 'completed',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]

      mockPaymentService.getPaymentHistoryByReservation.mockResolvedValue(mockPayments)

      const mockRefundResult = {
        success: true,
        refundAmount: 5000,
        transaction: {
          id: 'txn_123',
          reservationId: 'res_123',
          customerId: 'cust_123',
          amount: 10000,
          currency: 'jpy',
          provider: 'manual',
          paymentMethod: 'card',
          status: 'refunded',
          refundedAt: new Date(),
          refundAmount: 5000,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      }

      mockPaymentService.refundPayment = vi.fn().mockResolvedValue(mockRefundResult)

      const result = await reservationService.cancelReservationWithRefund(
        reservationId,
        refundAmount
      )

      expect(result.success).toBe(true)
      expect(result.refundResult).toBeDefined()
      expect(result.refundResult?.success).toBe(true)
      expect(result.refundResult?.refundAmount).toBe(5000)
    })
  })
})
