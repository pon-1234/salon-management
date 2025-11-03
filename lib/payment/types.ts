/**
 * @design_doc   Issue #5 - Payment System Integration
 * @related_to   ReservationData (payment fields), PaymentRecord (existing payment tracking)
 * @known_issues None identified
 */

import { BaseEntity } from '../shared'

// Payment provider types
export type PaymentProviderType = 'manual' | 'bank_transfer' | 'cash'
export type PaymentMethod = 'card' | 'bank_transfer' | 'cash'
export type PaymentStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'refunded'

// Payment intent for external providers
export interface PaymentIntent extends BaseEntity {
  providerId: string
  provider: PaymentProviderType
  amount: number
  currency: string
  status: PaymentStatus
  paymentMethod: PaymentMethod
  reservationId?: string
  customerId?: string
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
  provider: PaymentProviderType
  paymentMethod: PaymentMethod
  status: PaymentStatus
  paymentIntentId?: string
  stripePaymentId?: string
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
  provider?: PaymentProviderType
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
  providerPaymentId?: string
  metadata?: Record<string, any>
}

// Refund result
export interface RefundResult {
  success: boolean
  refundAmount?: number
  transaction?: PaymentTransaction
  error?: string
}
