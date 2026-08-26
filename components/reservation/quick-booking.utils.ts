/**
 * @design_doc   docs/SYSTEM_AUDIT_2026-07-26.md D-1 reservation module split
 * @related_to   QuickBookingDialog consumes these pure catalog, time, and designation helpers
 * @known_issues Business-hour normalization assumes ranges span no more than one midnight
 */
import { format } from 'date-fns'
import { utcToZonedTime } from 'date-fns-tz'
import type { Cast } from '@/lib/cast/types'
import { resolveOptionId } from '@/lib/options/data'
import type { BusinessHoursRange } from '@/lib/settings/business-hours'

export type DesignationType = 'none' | 'regular' | 'special'

export type PriceBreakdown = {
  basePrice: number
  designationFee: number
  optionsTotal: number
  transportationFee: number
  additionalFee: number
  discount: number
  total: number
  subtotal: number
  pointsApplied: number
  storeRevenue: number
  staffRevenue: number
  welfareExpense: number
  welfareRate: number
}

export interface BookingDetails {
  customerName: string
  customerType: string
  phoneNumber: string
  points: number
  usePoints: boolean
  pointsToUse: number
  areaId: string
  stationId: string
  stationName: string
  stationTravelTime: number
  bookingStatus: string
  staff: string
  marketingChannel: string
  date: string
  time: string
  options: Record<string, boolean>
  transportationFee: number
  additionalFee: number
  discountAmount: number
  paymentMethod: string
  paymentReference: string
  locationMemo: string
  notes: string
  hotelName: string
  roomNumber: string
}

export interface NormalizedCourse {
  id: string
  name: string
  duration: number
  price: number
  storeShare?: number | null
  castShare?: number | null
}

export interface NormalizedOption {
  id: string
  name: string
  price: number
  note?: string | null
  storeShare?: number | null
  castShare?: number | null
}

const JST_TIMEZONE = 'Asia/Tokyo'
const MINUTES_IN_DAY = 24 * 60

export const formatYen = (amount: number) => `${amount.toLocaleString()}円`

export const formatDateInJst = (date: Date) =>
  format(utcToZonedTime(date, JST_TIMEZONE), 'yyyy-MM-dd')

export const formatTimeInJst = (date: Date) => format(utcToZonedTime(date, JST_TIMEZONE), 'HH:mm')

function timeStringToMinutes(value: string): number | null {
  const match = value.match(/^(\d{1,2}):(\d{2})$/)
  if (!match) return null
  const hours = Number(match[1])
  const minutes = Number(match[2])
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null
  return hours * 60 + minutes
}

export function normalizeToBusinessMinutes(
  timeValue: string,
  range: BusinessHoursRange
): number | null {
  const base = timeStringToMinutes(timeValue)
  if (base === null) return null
  if (range.endMinutes > MINUTES_IN_DAY && base < range.startMinutes) {
    return base + MINUTES_IN_DAY
  }
  return base
}

export function getDesignationFeeAmount(type: DesignationType, cast?: Cast): number {
  if (!cast) return 0
  if (type === 'special') {
    return cast.specialDesignationFee ?? 0
  }
  if (type === 'regular') {
    return cast.regularDesignationFee ?? 0
  }
  return 0
}

export function getDesignationLabel(type: DesignationType, cast?: Cast): string {
  if (!cast) return 'フリー'
  if (type === 'special' && cast.specialDesignationFee) {
    return '特別指名'
  }
  if (type === 'regular' && cast.regularDesignationFee) {
    return '本指名'
  }
  return 'フリー'
}

export function getCastAvailableOptions(
  cast: Cast | null | undefined,
  options: NormalizedOption[]
): NormalizedOption[] {
  if (!cast) {
    return []
  }

  const allowedIds = new Set((cast.availableOptions ?? []).map((value) => resolveOptionId(value)))

  if (allowedIds.size === 0) {
    return []
  }

  return options.filter((option) => {
    const resolvedOptionId = resolveOptionId(option.id)
    return allowedIds.has(option.id) || allowedIds.has(resolvedOptionId)
  })
}

export function getUniqueSelectedOptionIds(optionIds: readonly string[]): string[] {
  return Array.from(new Set(optionIds))
}
