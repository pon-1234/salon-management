/**
 * @design_doc   Payment validation utilities
 * @related_to   PaymentService, payment processing
 * @known_issues None currently
 */

import { ProcessPaymentRequest } from './types'

const MIN_AMOUNT = 100 // 100円
const MAX_AMOUNT = 9999999 // 9,999,999円

export function validatePaymentAmount(amount: number): { valid: boolean; error?: string } {
  if (!Number.isInteger(amount)) {
    return { valid: false, error: 'Amount must be an integer' }
  }

  if (amount < MIN_AMOUNT) {
    return { valid: false, error: `Amount must be at least ${MIN_AMOUNT} JPY` }
  }

  if (amount > MAX_AMOUNT) {
    return { valid: false, error: `Amount must not exceed ${MAX_AMOUNT} JPY` }
  }

  return { valid: true }
}

export function validatePaymentRequest(request: ProcessPaymentRequest): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  // Validate amount
  const amountValidation = validatePaymentAmount(request.amount)
  if (!amountValidation.valid && amountValidation.error) {
    errors.push(amountValidation.error)
  }

  // Validate required fields
  if (!request.reservationId) {
    errors.push('Reservation ID is required')
  }

  if (!request.customerId) {
    errors.push('Customer ID is required')
  }

  if (!request.currency || request.currency !== 'jpy') {
    errors.push('Only JPY currency is supported')
  }

  if (!request.paymentMethod) {
    errors.push('Payment method is required')
  }

  if (!request.provider) {
    errors.push('Payment provider is required')
  }

  // Validate metadata
  if (request.metadata) {
    try {
      JSON.stringify(request.metadata)
    } catch {
      errors.push('Invalid metadata format')
    }
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

export function sanitizeMetadata(metadata: any): Record<string, string> {
  if (!metadata || typeof metadata !== 'object') {
    return {}
  }

  const sanitized: Record<string, string> = {}
  
  for (const [key, value] of Object.entries(metadata)) {
    // Only allow string keys and values
    if (typeof key === 'string' && key.length <= 40) {
      if (typeof value === 'string' && value.length <= 500) {
        sanitized[key] = value
      } else if (typeof value === 'number' || typeof value === 'boolean') {
        sanitized[key] = String(value)
      }
    }
  }

  return sanitized
}