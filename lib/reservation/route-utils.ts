/**
 * @design_doc   docs/SYSTEM_AUDIT_2026-07-26.md D-1 reservation API split
 * @related_to   app/api/reservation/route.ts request validation and response presentation
 * @known_issues Date-only input is interpreted as midnight in the store's Japan time zone
 */
import { format } from 'date-fns'
import { PAYMENT_METHODS, type PaymentMethod } from '@/lib/constants'
import { sanitizeCustomerReservationResponse } from '@/lib/http/customer-dto'
import { sanitizeResponseData } from '@/lib/http/sanitize-response'

const STATUS_LABEL_MAP: Record<string, string> = {
  confirmed: '確定済',
  pending: '仮予約',
  tentative: '仮予約',
  cancelled: 'キャンセル',
  modifiable: '修正待ち',
  completed: '対応済み',
}

const DESIGNATION_LABEL_MAP: Record<string, string> = {
  special: '特別指名',
  regular: '本指名',
  none: 'フリー',
}

const ALLOWED_PAYMENT_METHODS = new Set<PaymentMethod>(
  Object.values(PAYMENT_METHODS) as PaymentMethod[]
)
const RESERVATION_PRIVATE_CAST_FIELDS = ['loginEmail', 'lineUserId', 'welfareExpenseRate']

export function sanitizeReservationResponse<T>(value: T): T {
  return sanitizeResponseData(value, RESERVATION_PRIVATE_CAST_FIELDS)
}

export function sanitizeReservationResponseForRole<T>(value: T, role: string | undefined): T {
  return role === 'customer'
    ? sanitizeCustomerReservationResponse(value)
    : sanitizeReservationResponse(value)
}

export function isValidHotelExpense(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
}

export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return '未設定'
  }
  return `¥${value.toLocaleString()}`
}

export function formatText(value: unknown): string {
  if (value === null || value === undefined || value === '') {
    return '未設定'
  }
  return String(value)
}

export function formatStatus(value: string | null | undefined): string {
  if (!value) {
    return '未設定'
  }
  return STATUS_LABEL_MAP[value] ?? value
}

export function formatDesignation(value: string | null | undefined): string {
  if (!value) {
    return '未設定'
  }
  return DESIGNATION_LABEL_MAP[value] ?? value
}

export function normalizePaymentMethodInput(input: unknown): PaymentMethod | null {
  if (typeof input !== 'string') {
    return null
  }
  const trimmed = input.trim()
  if (trimmed.length === 0) {
    return null
  }
  const lower = trimmed.toLowerCase()
  if (lower.includes('card') || trimmed.includes('カード')) {
    return PAYMENT_METHODS.CARD
  }
  if (lower.includes('cash') || trimmed.includes('現金')) {
    return PAYMENT_METHODS.CASH
  }
  if (ALLOWED_PAYMENT_METHODS.has(trimmed as PaymentMethod)) {
    return trimmed as PaymentMethod
  }
  return null
}

export function formatSchedule(value: Date | null | undefined): string {
  if (!value) {
    return '未設定'
  }
  return format(value, 'yyyy/MM/dd HH:mm')
}

export function valuesDiffer(a: unknown, b: unknown): boolean {
  if (a === null || a === undefined) {
    return !(b === null || b === undefined)
  }
  if (b === null || b === undefined) {
    return true
  }
  if (a instanceof Date && b instanceof Date) {
    return a.getTime() !== b.getTime()
  }
  return a !== b
}

export function parseReservationDate(raw: string): Date {
  if (typeof raw !== 'string') {
    throw new Error('Invalid date format')
  }

  const trimmed = raw.trim()
  if (trimmed.length === 0) {
    throw new Error('Invalid date format')
  }

  const normalized = trimmed.replace(/\s+/g, 'T')
  const hasTimePortion = normalized.includes('T')
  let isoCandidate = normalized

  if (!hasTimePortion) {
    isoCandidate = `${isoCandidate}T00:00:00`
  } else if (/T\d{2}:\d{2}$/.test(isoCandidate)) {
    isoCandidate = `${isoCandidate}:00`
  }

  if (!/[Zz]|[+-]\d{2}:?\d{2}$/.test(isoCandidate)) {
    isoCandidate = `${isoCandidate}+09:00`
  }

  const parsed = new Date(isoCandidate)
  if (!Number.isNaN(parsed.getTime())) {
    return parsed
  }

  throw new Error('Invalid date format')
}
