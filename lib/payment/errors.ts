/**
 * @design_doc   Issue #5 - Payment provider and persistence error contract
 * @related_to   PaymentService and authenticated payment API routes
 * @known_issues Online provider reconciliation remains disabled until a provider is approved
 */

import { isExpectedUniqueConstraintError } from '@/lib/database/unique-constraint'

export const ACTIVE_PAYMENT_CONSTRAINT = 'PaymentTransaction_one_active_payment_per_reservation'

export class ActivePaymentConflictError extends Error {
  readonly code = 'ACTIVE_PAYMENT_EXISTS'

  constructor() {
    super('An active payment already exists for this reservation')
    this.name = 'ActivePaymentConflictError'
  }
}

export function isActivePaymentConflictError(error: unknown): boolean {
  return (
    error instanceof ActivePaymentConflictError ||
    isExpectedUniqueConstraintError(error, {
      name: ACTIVE_PAYMENT_CONSTRAINT,
      field: 'reservationId',
    })
  )
}

export class PaymentProviderUnavailableError extends Error {
  constructor(providerName: string, reason?: string) {
    super(
      reason
        ? `Payment provider ${providerName} is unavailable: ${reason}`
        : `Payment provider ${providerName} is unavailable`
    )
    this.name = 'PaymentProviderUnavailableError'
  }
}

export class PaymentProviderNotFoundError extends Error {
  constructor(providerName: string) {
    super(`Payment provider ${providerName} not supported`)
    this.name = 'PaymentProviderNotFoundError'
  }
}
