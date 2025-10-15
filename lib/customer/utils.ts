import { Customer, NgCastEntry } from './types'

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
  return value.replace(/\D/g, '')
}

function toDate(value: unknown, fallback: Date): Date {
  if (!value) return fallback
  const candidate = value instanceof Date ? value : new Date(value)
  return Number.isNaN(candidate.getTime()) ? fallback : candidate
}

function toOptionalDate(value: unknown): Date | undefined {
  if (!value) return undefined
  const candidate = value instanceof Date ? value : new Date(value)
  return Number.isNaN(candidate.getTime()) ? undefined : candidate
}

export function deserializeCustomer(raw: any): Customer {
  const createdAt = toDate(raw?.createdAt, new Date())
  const birthDate = toDate(raw?.birthDate, new Date())
  const updatedAt = toDate(raw?.updatedAt, createdAt)

  const registrationDate =
    toOptionalDate(raw?.registrationDate) ??
    (raw?.registrationDate === null ? undefined : createdAt)
  const lastLoginDate = toOptionalDate(raw?.lastLoginDate)
  const lastVisitDate = toOptionalDate(raw?.lastVisitDate)

  const ngCasts: NgCastEntry[] = Array.isArray(raw?.ngCasts)
    ? raw.ngCasts.map((entry: any) => ({
        castId: entry.castId,
        notes: entry.notes ?? undefined,
        addedDate: toDate(entry.addedDate, createdAt),
      }))
    : []

  const points = typeof raw?.points === 'number' ? raw.points : 0
  const smsEnabled = Boolean(raw?.smsEnabled)

  const normalized: Customer = {
    id: raw?.id ?? '',
    name: raw?.name ?? '',
    nameKana: raw?.nameKana ?? '',
    phone: raw?.phone ?? '',
    email: raw?.email ?? '',
    password: raw?.password ?? '',
    birthDate,
    age: typeof raw?.age === 'number' ? raw.age : calculateAge(birthDate),
    memberType: raw?.memberType === 'vip' ? 'vip' : 'regular',
    smsEnabled,
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
