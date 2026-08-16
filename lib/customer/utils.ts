/**
 * @design_doc   Customer API serialization and identity normalization
 * @related_to   CustomerRepositoryImpl; Customer detail reservation relations
 * @known_issues None
 */
import {
  Customer,
  CustomerUsageRecord,
  NgCastEntry,
  type CustomerAccountStatus,
  type CustomerMembershipStage,
} from './types'
import { RESERVATION_STATUS, type ReservationStatus } from '@/lib/constants'
import type { Reservation } from '@/lib/types/reservation'

export function calculateAge(birthDate: Date): number {
  const today = new Date()
  let age = today.getFullYear() - birthDate.getFullYear()
  const m = today.getMonth() - birthDate.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--
  }
  return age
}

export function normalizePhoneQuery(value: string): string {
  return value.normalize('NFKC').replace(/\D/g, '')
}

export function normalizePhoneNumber(value: string): string {
  return normalizePhoneQuery(value)
}

/**
 * Canonical customer identity format. New customer records use Japanese E.164,
 * while exact lookup variants keep historical national-format rows reachable.
 */
export function normalizeCustomerPhoneIdentity(value: string): string | null {
  const normalized = value.normalize('NFKC').trim()
  if (!normalized || !/^[0-9+()\-\sー－]+$/.test(normalized)) {
    return null
  }

  const plusMatches = normalized.match(/\+/g) ?? []
  if (plusMatches.length > 1 || (plusMatches.length === 1 && !normalized.startsWith('+'))) {
    return null
  }

  if (normalized.startsWith('+81')) {
    const internationalBody = normalized.slice(3)
    const withoutOptionalTrunk = internationalBody.replace(/^\s*\(0\)\s*/, '')
    const nationalNumber = withoutOptionalTrunk.replace(/\D/g, '')
    if (!/^[1-9]\d{8,9}$/.test(nationalNumber)) {
      return null
    }
    return `+81${nationalNumber}`
  }

  if (plusMatches.length > 0) {
    return null
  }

  const digits = normalized.replace(/\D/g, '')
  if (/^0[1-9]\d{8,9}$/.test(digits)) {
    return `+81${digits.slice(1)}`
  }
  if (/^81[1-9]\d{8,9}$/.test(digits)) {
    return `+${digits}`
  }
  return null
}

function isWritableJapaneseNationalPhone(value: string): boolean {
  if (value.startsWith('0800')) {
    return /^0800\d{7}$/.test(value)
  }
  if (/^(?:0120|0570)/.test(value)) {
    return /^(?:0120|0570)\d{6}$/.test(value)
  }
  if (/^(?:050|060|070|080|090)/.test(value)) {
    return /^(?:050|060|070|080|090)\d{8}$/.test(value)
  }
  return /^0[1-9]\d{8}$/.test(value)
}

/**
 * Validates a newly persisted customer phone without narrowing legacy lookup compatibility.
 */
export function normalizeWritableCustomerPhoneIdentity(value: string): string | null {
  const canonical = normalizeCustomerPhoneIdentity(value)
  if (!canonical) {
    return null
  }
  const national = `0${canonical.slice(3)}`
  return isWritableJapaneseNationalPhone(national) ? canonical : null
}

export function getCustomerPhoneIdentityVariants(value: string): string[] {
  const canonical = normalizeCustomerPhoneIdentity(value)
  if (canonical) {
    return [canonical, `0${canonical.slice(3)}`, canonical.slice(1)]
  }

  const normalized = value.normalize('NFKC').trim()
  if (!normalized || !/^[0-9()\-\sー－]+$/.test(normalized)) {
    return []
  }
  const digits = normalized.replace(/\D/g, '')
  return /^[1-9]\d{9,10}$/.test(digits) ? [digits] : []
}

export function getCustomerPhoneSearchFragments(value: string): string[] {
  const exactIdentities = getCustomerPhoneIdentityVariants(value)
  if (exactIdentities.length > 0) {
    return exactIdentities.length > 1 ? exactIdentities.slice(1) : exactIdentities
  }

  const digits = normalizePhoneQuery(value)
  if (digits.length < 3) {
    return []
  }

  const fragments = [digits]
  if (/^0[1-9]/.test(digits)) {
    fragments.push(`81${digits.slice(1)}`)
  } else if (/^81[1-9]/.test(digits)) {
    fragments.push(`0${digits.slice(2)}`)
  }
  return [...new Set(fragments)]
}

export function isSameCustomerPhone(left: string, right: string): boolean {
  const leftIdentities = new Set(getCustomerPhoneIdentityVariants(left))
  return getCustomerPhoneIdentityVariants(right).some((identity) => leftIdentities.has(identity))
}

export function isValidPhoneInput(value: string): boolean {
  return /^[0-9+()\-\sー－]+$/.test(value.normalize('NFKC'))
}

export function getCustomerPhoneTelHref(value: string): string {
  const canonical = normalizeCustomerPhoneIdentity(value)
  return `tel:${canonical ?? normalizePhoneQuery(value)}`
}

export function formatPhoneNumber(value: string): string {
  const canonical = normalizeCustomerPhoneIdentity(value)
  const digits = canonical ? `0${canonical.slice(3)}` : normalizePhoneNumber(value)
  if (/^0800\d{7}$/.test(digits)) {
    return `${digits.slice(0, 4)}-${digits.slice(4, 7)}-${digits.slice(7)}`
  }
  if (/^(?:050|060|070|080|090)\d{8}$/.test(digits)) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`
  }
  if (/^(?:0120|0570)\d{6}$/.test(digits)) {
    return `${digits.slice(0, 4)}-${digits.slice(4, 7)}-${digits.slice(7)}`
  }
  if (/^(?:03|06)\d{8}$/.test(digits)) {
    return `${digits.slice(0, 2)}-${digits.slice(2, 6)}-${digits.slice(6)}`
  }
  return digits || value
}

function toDate(value: unknown, fallback: Date): Date {
  if (!value) return fallback
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? fallback : value
  }
  if (typeof value === 'string' || typeof value === 'number') {
    const candidate = new Date(value)
    return Number.isNaN(candidate.getTime()) ? fallback : candidate
  }
  return fallback
}

function toOptionalDate(value: unknown): Date | undefined {
  if (!value) return undefined
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? undefined : value
  }
  if (typeof value === 'string' || typeof value === 'number') {
    const candidate = new Date(value)
    return Number.isNaN(candidate.getTime()) ? undefined : candidate
  }
  return undefined
}

function toReservationStatus(value: unknown): ReservationStatus | null {
  return Object.values(RESERVATION_STATUS).includes(value as ReservationStatus)
    ? (value as ReservationStatus)
    : null
}

function toCustomerAccountStatus(value: unknown): CustomerAccountStatus {
  const statuses: CustomerAccountStatus[] = ['pending', 'active', 'withdrawn', 'blocked', 'unknown']
  return statuses.includes(value as CustomerAccountStatus)
    ? (value as CustomerAccountStatus)
    : 'active'
}

function toCustomerMembershipStage(value: unknown): CustomerMembershipStage {
  const stages: CustomerMembershipStage[] = [
    'regular',
    'silver',
    'gold',
    'platinum',
    'god',
    'unknown',
  ]
  return stages.includes(value as CustomerMembershipStage)
    ? (value as CustomerMembershipStage)
    : 'regular'
}

function deserializeReservation(raw: any): Reservation | null {
  const id = typeof raw?.id === 'string' ? raw.id : ''
  const customerId = typeof raw?.customerId === 'string' ? raw.customerId : ''
  const storeId = typeof raw?.storeId === 'string' ? raw.storeId : ''
  const startTime = toOptionalDate(raw?.startTime)
  const endTime = toOptionalDate(raw?.endTime)
  const status = toReservationStatus(raw?.status)
  if (!id || !customerId || !storeId || !startTime || !endTime || !status) {
    return null
  }

  const castId = typeof raw?.castId === 'string' ? raw.castId : ''
  const courseId = typeof raw?.courseId === 'string' ? raw.courseId : ''
  const createdAt = toDate(raw?.createdAt, startTime)
  const updatedAt = toDate(raw?.updatedAt, createdAt)

  return {
    id,
    customerId,
    staffId: castId,
    castId: castId || undefined,
    serviceId: courseId,
    courseId: courseId || undefined,
    startTime,
    endTime,
    status,
    price: typeof raw?.price === 'number' ? raw.price : 0,
    storeId,
    notes: typeof raw?.notes === 'string' ? raw.notes : undefined,
    storeMemo: typeof raw?.storeMemo === 'string' ? raw.storeMemo : undefined,
    staffName: typeof raw?.cast?.name === 'string' ? raw.cast.name : undefined,
    serviceName: typeof raw?.course?.name === 'string' ? raw.course.name : undefined,
    designationType:
      typeof raw?.designationType === 'string' ? raw.designationType : raw?.designationType,
    designationFee: typeof raw?.designationFee === 'number' ? raw.designationFee : undefined,
    transportationFee:
      typeof raw?.transportationFee === 'number' ? raw.transportationFee : undefined,
    additionalFee: typeof raw?.additionalFee === 'number' ? raw.additionalFee : undefined,
    discountAmount: typeof raw?.discountAmount === 'number' ? raw.discountAmount : undefined,
    welfareExpense: typeof raw?.welfareExpense === 'number' ? raw.welfareExpense : undefined,
    storeRevenue: typeof raw?.storeRevenue === 'number' ? raw.storeRevenue : undefined,
    staffRevenue: typeof raw?.staffRevenue === 'number' ? raw.staffRevenue : undefined,
    paymentMethod: typeof raw?.paymentMethod === 'string' ? raw.paymentMethod : undefined,
    marketingChannel: typeof raw?.marketingChannel === 'string' ? raw.marketingChannel : undefined,
    areaId: typeof raw?.areaId === 'string' ? raw.areaId : null,
    areaName: typeof raw?.area?.name === 'string' ? raw.area.name : undefined,
    areaPrefecture: typeof raw?.area?.prefecture === 'string' ? raw.area.prefecture : undefined,
    areaCity: typeof raw?.area?.city === 'string' ? raw.area.city : undefined,
    stationId: typeof raw?.stationId === 'string' ? raw.stationId : null,
    stationName: typeof raw?.station?.name === 'string' ? raw.station.name : undefined,
    hotelId: typeof raw?.hotelId === 'string' ? raw.hotelId : null,
    hotelName: typeof raw?.hotelName === 'string' ? raw.hotelName : null,
    hotelExpense: typeof raw?.hotelExpense === 'number' ? raw.hotelExpense : undefined,
    roomNumber: typeof raw?.roomNumber === 'string' ? raw.roomNumber : null,
    locationMemo: typeof raw?.locationMemo === 'string' ? raw.locationMemo : undefined,
    pointsUsed: typeof raw?.pointsUsed === 'number' ? raw.pointsUsed : undefined,
    options: Array.isArray(raw?.options) ? raw.options : undefined,
    createdAt,
    updatedAt,
  }
}

export function partitionCustomerReservationHistory(reservations: Reservation[]): {
  activeReservations: Reservation[]
  usageHistory: CustomerUsageRecord[]
} {
  const activeReservations: Reservation[] = []
  const usageHistory: CustomerUsageRecord[] = []

  for (const reservation of reservations) {
    if (reservation.status !== 'completed' && reservation.status !== 'cancelled') {
      activeReservations.push(reservation)
      continue
    }
    usageHistory.push({
      id: reservation.id,
      date: reservation.startTime,
      serviceName: reservation.serviceName ?? 'コース情報なし',
      staffName: reservation.staffName ?? '担当キャスト未設定',
      amount: reservation.price,
      status: reservation.status,
    })
  }

  return { activeReservations, usageHistory }
}

export function findCustomerReservationByUsageRecordId(
  reservations: Reservation[],
  usageRecordId: string
): Reservation | null {
  return reservations.find((reservation) => reservation.id === usageRecordId) ?? null
}

export function deserializeCustomer(raw: any): Customer {
  const createdAt = toDate(raw?.createdAt, new Date())
  const birthDate = toOptionalDate(raw?.birthDate)
  const updatedAt = toDate(raw?.updatedAt, createdAt)

  const registrationDate =
    toOptionalDate(raw?.registrationDate) ??
    (raw?.registrationDate === null ? undefined : createdAt)
  const lastLoginDate = toOptionalDate(raw?.lastLoginAt ?? raw?.lastLoginDate)
  const lastVisitDate = toOptionalDate(raw?.lastVisitAt ?? raw?.lastVisitDate)

  const ngCasts: NgCastEntry[] = Array.isArray(raw?.ngCasts)
    ? raw.ngCasts.map((entry: any) => ({
        castId: entry.castId,
        notes: entry.notes ?? undefined,
        addedDate: toDate(entry.assignedAt ?? entry.addedDate, createdAt),
        assignedBy: entry.assignedBy ?? 'customer',
      }))
    : []

  const points = typeof raw?.points === 'number' ? raw.points : 0
  const smsEnabled = Boolean(raw?.smsEnabled)
  const emailNotificationEnabled =
    raw?.emailNotificationEnabled === undefined ? true : Boolean(raw.emailNotificationEnabled)
  const phoneVerified = Boolean(raw?.phoneVerified)
  const phoneVerifiedAt = toOptionalDate(raw?.phoneVerifiedAt)
  const reservations = Array.isArray(raw?.reservations)
    ? raw.reservations
        .map(deserializeReservation)
        .filter(
          (reservation: Reservation | null): reservation is Reservation => reservation !== null
        )
    : []

  const normalized: Customer = {
    id: raw?.id ?? '',
    name: raw?.name ?? '',
    nameKana: raw?.nameKana ?? '',
    phone: raw?.phone ?? '',
    email: raw?.email ?? '',
    password: raw?.password ?? '',
    birthDate,
    age: typeof raw?.age === 'number' ? raw.age : birthDate ? calculateAge(birthDate) : undefined,
    memberType: raw?.memberType === 'vip' ? 'vip' : 'regular',
    accountStatus: toCustomerAccountStatus(raw?.accountStatus),
    membershipStage: toCustomerMembershipStage(raw?.membershipStage),
    smsEnabled,
    emailNotificationEnabled,
    phoneVerified,
    phoneVerifiedAt,
    points,
    registrationDate: registrationDate ?? createdAt,
    lastLoginDate,
    lastVisitDate,
    notes: raw?.notes ?? undefined,
    ngCastIds: Array.isArray(raw?.ngCastIds) ? raw.ngCastIds : ngCasts.map((entry) => entry.castId),
    ngCasts,
    image: raw?.image ?? undefined,
    visitCount: raw?.visitCount ?? undefined,
    lastVisit: toOptionalDate(raw?.lastVisit),
    reservations,
    createdAt,
    updatedAt,
  }

  return normalized
}

/** @no-test-required reason: Unused internal function - not exported or referenced */
function getTotalPoints(customers: Customer[]): number {
  return customers.reduce((total, customer) => total + customer.points, 0)
}

/** @no-test-required reason: Unused internal function - not exported or referenced */
function getTopCustomers(customers: Customer[], limit: number): Customer[] {
  return customers.sort((a, b) => b.points - a.points).slice(0, limit)
}

/** @no-test-required reason: Unused internal function - not exported or referenced */
function calculateCustomerLoyalty(customer: Customer, totalVisits: number): string {
  if (totalVisits > 20) return 'VIP'
  if (totalVisits > 10) return 'Loyal'
  if (totalVisits > 5) return 'Regular'
  return 'New'
}
