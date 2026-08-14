/**
 * @design_doc   Non-sensitive reservation payment-reference and cancellation-reason boundary
 * @related_to   Reservation API POST/PUT and administrator reservation forms
 * @known_issues Payment-provider transaction IDs remain owned by PaymentTransaction
 */

const MAX_PAYMENT_REFERENCE_LENGTH = 100
const MAX_CANCELLATION_REASON_LENGTH = 500

export function normalizePaymentReference(input: unknown): string {
  if (typeof input !== 'string') {
    throw new Error('INVALID_PAYMENT_REFERENCE')
  }

  const normalized = input.trim()
  const digitsOnly = normalized.replace(/\D/gu, '')
  const looksLikeCardNumber =
    /^[\d\s-]+$/u.test(normalized) && digitsOnly.length >= 13 && digitsOnly.length <= 19

  if (
    normalized.length === 0 ||
    normalized.length > MAX_PAYMENT_REFERENCE_LENGTH ||
    looksLikeCardNumber
  ) {
    throw new Error('INVALID_PAYMENT_REFERENCE')
  }

  return normalized
}

export function normalizeCancellationReason(input: unknown): string {
  if (typeof input !== 'string') {
    throw new Error('INVALID_CANCELLATION_REASON')
  }

  const normalized = input.trim()
  if (normalized.length === 0 || normalized.length > MAX_CANCELLATION_REASON_LENGTH) {
    throw new Error('INVALID_CANCELLATION_REASON')
  }

  return normalized
}
