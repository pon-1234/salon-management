/**
 * @design_doc   Issue #5 - Payment System Integration
 * @related_to   PaymentTransaction, PaymentIntent (core payment types)
 * @known_issues None identified
 */

import {
  PaymentIntent,
  PaymentTransaction,
  ProcessPaymentRequest,
  ProcessPaymentResult,
  RefundRequest,
  RefundResult,
} from '../types'

/**
 * Abstract base class for payment providers
 */
export abstract class PaymentProvider {
  abstract readonly name: string
  abstract readonly supportedMethods: string[]

  /**
   * Process a payment with the provider
   */
  abstract processPayment(request: ProcessPaymentRequest): Promise<ProcessPaymentResult>

  /**
   * Create a payment intent for client-side processing
   */
  abstract createPaymentIntent(request: ProcessPaymentRequest): Promise<PaymentIntent>

  /**
   * Confirm a payment intent
   */
  abstract confirmPaymentIntent(intentId: string): Promise<ProcessPaymentResult>

  /**
   * Refund a completed payment
   */
  abstract refundPayment(request: RefundRequest): Promise<RefundResult>

  /**
   * Get payment status from provider
   */
  abstract getPaymentStatus(transactionId: string): Promise<PaymentTransaction>

  /**
   * Validate provider configuration
   */
  abstract validateConfig(): Promise<boolean>
}
