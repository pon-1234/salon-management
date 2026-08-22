/**
 * @design_doc   PAY-01 クレジット手数料を 0% / 10% で切り替える
 * @related_to   StoreSettings.creditCardFeeRate, reservation revenue
 * @known_issues None
 */
export const CREDIT_CARD_FEE_RATES = [0, 10] as const
export type CreditCardFeeRate = (typeof CREDIT_CARD_FEE_RATES)[number]
export const DEFAULT_CREDIT_CARD_FEE_RATE: CreditCardFeeRate = 10

export function normalizeCreditCardFeeRate(value: unknown): CreditCardFeeRate {
  return Number(value) === 0 ? 0 : DEFAULT_CREDIT_CARD_FEE_RATE
}

export function isCreditCardPaymentMethod(paymentMethod?: string | null): boolean {
  if (!paymentMethod) return false
  const lower = paymentMethod.toLowerCase()
  return paymentMethod.includes('カード') || lower.includes('card')
}

export function calculateCreditCardFee(
  subtotal: number,
  rate: CreditCardFeeRate,
  paymentMethod?: string | null
): number {
  if (!isCreditCardPaymentMethod(paymentMethod)) {
    return 0
  }
  if (rate !== 10) {
    return 0
  }
  return Math.max(0, Math.round(subtotal * (rate / 100)))
}

export function applyCreditCardFee<T extends { total: number; storeRevenue: number }>(
  revenue: T,
  rate: CreditCardFeeRate,
  paymentMethod?: string | null
): T & { creditCardFee: number } {
  const creditCardFee = calculateCreditCardFee(revenue.total, rate, paymentMethod)
  return {
    ...revenue,
    creditCardFee,
    total: revenue.total + creditCardFee,
    storeRevenue: revenue.storeRevenue + creditCardFee,
  }
}

export function applyStoreCreditCardFee<
  T extends { total: number; storeRevenue: number; staffRevenue: number },
>(
  revenue: T,
  creditCardFeeRate: unknown,
  paymentMethod?: string | null
): T & { creditCardFee: number } {
  const priced = applyCreditCardFee(
    revenue,
    normalizeCreditCardFeeRate(creditCardFeeRate),
    paymentMethod
  )
  return {
    ...priced,
    storeRevenue: Math.min(priced.storeRevenue, priced.total),
  }
}
