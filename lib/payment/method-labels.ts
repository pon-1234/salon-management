/**
 * @design_doc   PAY-06 キャッシュ / 現金精算の表記を現金に統一する
 * @related_to   PAYMENT_METHODS, SettlementPayment.method
 * @known_issues None
 */
import { PAYMENT_METHODS } from '@/lib/constants'

export const SETTLEMENT_CASH_METHOD = '現金'
export const SETTLEMENT_METHOD_OPTIONS = ['現金', '振込', 'その他'] as const

export function displayPaymentMethodLabel(input?: string | null): string {
  if (!input) return PAYMENT_METHODS.CASH
  const trimmed = input.trim()
  if (!trimmed) return PAYMENT_METHODS.CASH
  const lower = trimmed.toLowerCase()
  if (trimmed.includes('カード') || lower.includes('card')) {
    return PAYMENT_METHODS.CARD
  }
  if (
    trimmed.includes('現金') ||
    trimmed.includes('キャッシュ') ||
    lower.includes('cash') ||
    trimmed === '現金精算'
  ) {
    return PAYMENT_METHODS.CASH
  }
  return trimmed
}

export function displaySettlementMethodLabel(input?: string | null): string {
  if (!input) return SETTLEMENT_CASH_METHOD
  const trimmed = input.trim()
  if (!trimmed) return SETTLEMENT_CASH_METHOD
  if (trimmed === '現金精算' || trimmed === 'キャッシュ' || trimmed.toLowerCase() === 'cash') {
    return SETTLEMENT_CASH_METHOD
  }
  return trimmed
}

export function persistSettlementMethod(input?: string | null): string {
  if (!input) return SETTLEMENT_CASH_METHOD
  const trimmed = input.trim()
  if (!trimmed) return SETTLEMENT_CASH_METHOD
  if (trimmed === '現金精算' || trimmed === 'キャッシュ') {
    return SETTLEMENT_CASH_METHOD
  }
  return trimmed
}
