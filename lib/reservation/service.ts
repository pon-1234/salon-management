/**
 * @design_doc   Issue #5 - Payment System Integration
 * @related_to   PaymentService (payment processing), Reservation (domain models)
 * @known_issues None identified
 */

import { PaymentService } from '@/lib/payment/service'
import {
  ProcessPaymentRequest,
  ProcessPaymentResult,
  PaymentIntent,
  PaymentTransaction,
} from '@/lib/payment/types'
import { prisma } from '@/lib/generated/prisma'

export interface CreateReservationWithPaymentData {
  customerId: string
  castId: string
  courseId: string
  startTime: Date
  endTime: Date
  amount: number
  paymentMethod: 'card' | 'bank_transfer' | 'cash'
  paymentProvider: 'stripe' | 'payjp'
}

export interface ReservationWithPaymentResult {
  success: boolean
  reservation?: any
  paymentResult?: ProcessPaymentResult
  paymentIntent?: PaymentIntent
  error?: string
}

export interface ReservationWithPayments {
  reservation: any
  payments: PaymentTransaction[]
}

export interface CancelReservationResult {
  success: boolean
  refundResult?: any
  error?: string
}

export class ReservationService {
  constructor(private paymentService: PaymentService) {}

  async createReservationWithPayment(
    data: CreateReservationWithPaymentData
  ): Promise<ReservationWithPaymentResult> {
    try {
      // First create the reservation
      const reservation = await this.createReservation({
        customerId: data.customerId,
        castId: data.castId,
        courseId: data.courseId,
        startTime: data.startTime,
        endTime: data.endTime,
        status: 'pending', // Start as pending until payment succeeds
      })

      // Then process the payment
      const paymentRequest: ProcessPaymentRequest = {
        reservationId: reservation.id,
        customerId: data.customerId,
        amount: data.amount,
        currency: 'jpy',
        paymentMethod: data.paymentMethod,
        provider: data.paymentProvider,
      }

      const paymentResult = await this.paymentService.processPayment(paymentRequest)

      if (paymentResult.success) {
        // Update reservation status to confirmed
        await this.updateReservationStatus(reservation.id, 'confirmed')

        return {
          success: true,
          reservation: { ...reservation, status: 'confirmed' },
          paymentResult,
        }
      } else {
        // Payment failed, cancel the reservation
        await this.updateReservationStatus(reservation.id, 'cancelled')

        return {
          success: false,
          error: `Payment failed: ${paymentResult.error}`,
        }
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  async createReservationWithPaymentIntent(
    data: CreateReservationWithPaymentData
  ): Promise<ReservationWithPaymentResult> {
    try {
      // Create the reservation first (will be confirmed later after payment)
      const reservation = await this.createReservation({
        customerId: data.customerId,
        castId: data.castId,
        courseId: data.courseId,
        startTime: data.startTime,
        endTime: data.endTime,
        status: 'pending',
      })

      // Create payment intent for client-side processing
      const paymentRequest: ProcessPaymentRequest = {
        reservationId: reservation.id,
        customerId: data.customerId,
        amount: data.amount,
        currency: 'jpy',
        paymentMethod: data.paymentMethod,
        provider: data.paymentProvider,
      }

      const paymentIntent = await this.paymentService.createPaymentIntent(paymentRequest)

      return {
        success: true,
        reservation,
        paymentIntent,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  async getReservationWithPayments(reservationId: string): Promise<ReservationWithPayments> {
    const reservation = await this.getReservation(reservationId)
    const payments = await this.paymentService.getPaymentHistoryByReservation(reservationId)

    return {
      reservation,
      payments,
    }
  }

  async cancelReservationWithRefund(
    reservationId: string,
    refundAmount?: number
  ): Promise<CancelReservationResult> {
    try {
      // Get payment transactions for this reservation
      const payments = await this.paymentService.getPaymentHistoryByReservation(reservationId)
      const completedPayment = payments.find((p) => p.status === 'completed')

      if (completedPayment && refundAmount) {
        // Process refund
        const refundResult = await this.paymentService.refundPayment({
          transactionId: completedPayment.id,
          amount: refundAmount,
          reason: 'reservation_cancelled',
        })

        if (refundResult.success) {
          // Update reservation status
          await this.updateReservationStatus(reservationId, 'cancelled')

          return {
            success: true,
            refundResult,
          }
        } else {
          return {
            success: false,
            error: `Refund failed: ${refundResult.error}`,
          }
        }
      } else {
        // No payment or refund amount, just cancel the reservation
        await this.updateReservationStatus(reservationId, 'cancelled')

        return {
          success: true,
        }
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  private async createReservation(data: {
    customerId: string
    castId: string
    courseId: string
    startTime: Date
    endTime: Date
    status: string
  }) {
    // Mock implementation - would use Prisma to create reservation
    return {
      id: `res_${Date.now()}`,
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
  }

  private async getReservation(reservationId: string) {
    // Mock implementation - would use Prisma to get reservation
    return {
      id: reservationId,
      customerId: 'cust_123',
      castId: 'cast_123',
      courseId: 'course_123',
      startTime: new Date(),
      endTime: new Date(),
      status: 'confirmed',
      createdAt: new Date(),
      updatedAt: new Date(),
    }
  }

  private async updateReservationStatus(reservationId: string, status: string) {
    // Mock implementation - would use Prisma to update reservation
    console.log(`Updating reservation ${reservationId} status to ${status}`)
  }
}
