/**
 * @design_doc   Non-sensitive reservation payment-reference boundary
 * @related_to   reservation route POST/PUT and admin reservation forms
 * @known_issues Payment-provider transaction IDs remain owned by PaymentTransaction
 */
import { describe, expect, it } from 'vitest'

import {
  normalizeCancellationReason,
  normalizeOptionalPaymentReference,
  normalizePaymentReference,
} from './financial-reference'

describe('normalizePaymentReference', () => {
  it('trims an operator-facing receipt management number', () => {
    expect(normalizePaymentReference('  IK-2026-00421  ')).toBe('IK-2026-00421')
  })

  it.each(['', '   ', '1234567890123', '4111 1111 1111 1111', 'x'.repeat(101)])(
    'rejects an empty, PAN-like, or oversized value: %s',
    (value) => {
      expect(() => normalizePaymentReference(value)).toThrow('INVALID_PAYMENT_REFERENCE')
    }
  )

  it('allows a card reservation to close without a management number yet', () => {
    expect(normalizeOptionalPaymentReference('')).toBeNull()
    expect(normalizeOptionalPaymentReference(null)).toBeNull()
    expect(normalizeOptionalPaymentReference(' IK-1 ')).toBe('IK-1')
  })
})

describe('normalizeCancellationReason', () => {
  it('trims a concrete cancellation reason', () => {
    expect(normalizeCancellationReason('  キャスト体調不良のため  ')).toBe('キャスト体調不良のため')
  })

  it.each(['', '  ', 'x'.repeat(501)])('rejects an empty or oversized reason: %s', (value) => {
    expect(() => normalizeCancellationReason(value)).toThrow('INVALID_CANCELLATION_REASON')
  })
})
