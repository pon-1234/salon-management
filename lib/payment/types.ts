/**
 * @design_doc   Issue #5 - Payment System Integration
 * @related_to   ReservationData (payment fields), PaymentRecord (existing payment tracking)
 * @known_issues None identified
 */

import { BaseEntity } from '../shared'

// Payment provider types
export type PaymentProvider = 'stripe' | 'payjp'
export type PaymentMethod = 'card' | 'bank_transfer' | 'cash'
export type PaymentStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'refunded'

// Payment intent for external providers
export interface PaymentIntent extends BaseEntity {
  providerId: string
  provider: PaymentProvider
  amount: number
  currency: string
  status: PaymentStatus
  paymentMethod: PaymentMethod
  metadata?: Record<string, any>
  clientSecret?: string
  errorMessage?: string
  processedAt?: Date
}

// Payment transaction record
export interface PaymentTransaction extends BaseEntity {
  reservationId: string
  customerId: string
  amount: number
  currency: string
  provider: PaymentProvider
  paymentMethod: PaymentMethod
  status: PaymentStatus
  intentId?: string
  providerTransactionId?: string
  metadata?: Record<string, any>
  errorMessage?: string
  processedAt?: Date
  refundedAt?: Date
  refundAmount?: number
}

// Payment processing request
export interface ProcessPaymentRequest {
  reservationId: string
  customerId: string
  amount: number
  currency: string
  paymentMethod: PaymentMethod
  provider: PaymentProvider
  metadata?: Record<string, any>
}

// Payment processing result
export interface ProcessPaymentResult {
  success: boolean
  transaction?: PaymentTransaction
  intent?: PaymentIntent
  error?: string
  requiresAction?: boolean
  clientSecret?: string
}

// Refund request
export interface RefundRequest {
  transactionId: string
  amount?: number // partial refund if specified
  reason?: string
}

// Refund result
export interface RefundResult {
  success: boolean
  refundAmount: number
  transaction: PaymentTransaction
  error?: string
}