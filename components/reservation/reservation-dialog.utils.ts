/**
 * @design_doc   refactor-instructions.md Phase 5 reservation dialog extraction
 * @related_to   reservation-dialog.tsx: extracted pure display and normalization helpers
 * @known_issues Larger form-state and UI extraction remains in reservation-dialog.tsx
 */
import { MARKETING_CHANNELS, PAYMENT_METHODS, type PaymentMethod } from '@/lib/constants'
import { calculateReservationRevenue } from '@/lib/reservation/revenue'

export const PAYMENT_METHOD_OPTIONS = Object.values(PAYMENT_METHODS) as PaymentMethod[]
const DEFAULT_MARKETING_CHANNELS = [...MARKETING_CHANNELS]

interface ReservationPriceBreakdownInput {
  selectedCoursePrice?: unknown
  fallbackCoursePrice?: unknown
  options: Array<{
    price?: unknown
    storeShare?: number | null
    castShare?: number | null
  }>
  transportationFee?: unknown
  additionalFee?: unknown
  discountAmount?: unknown
  pointsUsed?: unknown
  designationFee?: unknown
  designation?: {
    storeShare?: number | null
    castShare?: number | null
  } | null
  welfareRate?: number | null
}

export function calculateReservationPriceBreakdown(input: ReservationPriceBreakdownInput) {
  const fallbackCoursePrice = toNumber(input.fallbackCoursePrice, 0)
  const basePrice =
    input.selectedCoursePrice == null
      ? fallbackCoursePrice
      : toNumber(input.selectedCoursePrice, fallbackCoursePrice)
  const transportation = toNumber(input.transportationFee, 0)
  const additional = toNumber(input.additionalFee, 0)
  const discount = Math.max(toNumber(input.discountAmount, 0), 0)
  const pointsUsed = Math.max(toNumber(input.pointsUsed, 0), 0)
  const designation = Math.max(toNumber(input.designationFee, 0), 0)

  const revenue = calculateReservationRevenue({
    basePrice,
    options: input.options.map((option) => ({
      price: toNumber(option.price, 0),
      storeShare: option.storeShare ?? undefined,
      castShare: option.castShare ?? undefined,
    })),
    designation:
      designation > 0
        ? {
            amount: designation,
            storeShare: input.designation?.storeShare ?? 0,
            castShare: input.designation?.castShare ?? designation,
          }
        : null,
    transportationFee: transportation,
    additionalFee: additional,
    discountAmount: discount + pointsUsed,
    welfareRate: input.welfareRate,
  })

  return {
    basePrice,
    optionTotal: revenue.optionsTotal,
    transportation: revenue.transportationFee,
    additional: revenue.additionalFee,
    designation,
    discount,
    pointsUsed,
    total: revenue.total,
    storeRevenue: revenue.storeRevenue,
    staffRevenue: revenue.staffRevenue,
    welfareExpense: revenue.welfareExpense,
    welfareRate: revenue.welfareRate,
  }
}

export function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value === 'string') {
    const normalized = value.replace(/[^\d.-]/g, '')
    const parsed = Number(normalized)
    if (Number.isFinite(parsed)) {
      return parsed
    }
  }

  return fallback
}

export function toNullableNumber(value: unknown): number | null {
  const parsed = toNumber(value, Number.NaN)
  return Number.isFinite(parsed) ? parsed : null
}

export function formatMinutes(value: number | null | undefined): string {
  if (!Number.isFinite(value ?? Number.NaN) || !value || value <= 0) {
    return '0分'
  }

  const wholeMinutes = Math.round(value)
  const hours = Math.floor(wholeMinutes / 60)
  const minutes = wholeMinutes % 60

  if (hours > 0 && minutes > 0) {
    return `${hours}時間${minutes}分`
  }
  if (hours > 0) {
    return `${hours}時間`
  }
  return `${minutes}分`
}

export function formatCurrency(amount: number | undefined): string {
  if (typeof amount !== 'number') return '¥0'
  return `¥${amount.toLocaleString()}`
}

export function normalizePaymentMethodValue(input?: string | null): PaymentMethod {
  if (!input) {
    return PAYMENT_METHODS.CASH
  }
  const trimmed = input.trim()
  if (trimmed.length === 0) {
    return PAYMENT_METHODS.CASH
  }
  const lower = trimmed.toLowerCase()
  if (trimmed.includes('カード') || lower.includes('card')) {
    return PAYMENT_METHODS.CARD
  }
  if (trimmed.includes('現金') || lower.includes('cash')) {
    return PAYMENT_METHODS.CASH
  }
  if (PAYMENT_METHOD_OPTIONS.includes(trimmed as PaymentMethod)) {
    return trimmed as PaymentMethod
  }
  return PAYMENT_METHODS.CASH
}

export function normalizeMarketingChannelValue(
  input: string | null | undefined,
  available: string[]
): string {
  const fallback = available[0] ?? DEFAULT_MARKETING_CHANNELS[0] ?? 'WEB'
  if (typeof input !== 'string') {
    return fallback
  }
  const trimmed = input.trim()
  if (trimmed.length === 0) {
    return fallback
  }
  if (available.includes(trimmed)) {
    return trimmed
  }
  const lower = trimmed.toLowerCase()
  const match = available.find((channel) => channel.toLowerCase() === lower)
  return match ?? trimmed
}
