import { Reservation } from '@/lib/types/reservation'
import { resolveApiUrl } from '@/lib/http/base-url'
import {
  addMockReservation,
  getAllMockReservations,
  getMockReservationsByCustomerId,
  updateMockReservation,
} from './mock-data'
import { shouldUseMockFallbacks } from '@/lib/config/feature-flags'

let cachedLogger: any = undefined

function logWarning(message: string, details?: unknown) {
  if (typeof window !== 'undefined') {
    console.warn(message, details)
    return
  }

  if (cachedLogger === undefined) {
    try {
      cachedLogger = require('@/lib/logger').default
    } catch (error) {
      console.warn('Logger unavailable, falling back to console.warn', error)
      cachedLogger = null
    }
  }

  if (cachedLogger) {
    cachedLogger.warn(details ?? {}, message)
  } else {
    console.warn(message, details)
  }
}

const RESERVATION_API_PATH = '/api/reservation'

interface ReservationQuery {
  customerId?: string
  limit?: number
  offset?: number
  status?: string
  castId?: string
  startDate?: string
  endDate?: string
  storeId?: string
}

function normalizeReservation(entry: any): Reservation {
  return {
    id: entry.id,
    customerId: entry.customerId,
    staffId: entry.staffId || entry.castId || '',
    castId: entry.castId ?? entry.staffId ?? undefined,
    serviceId: entry.serviceId || entry.courseId || '',
    storeId: entry.storeId || entry.cast?.storeId || 'ikebukuro',
    startTime: new Date(entry.startTime),
    endTime: new Date(entry.endTime),
    status: entry.status as Reservation['status'],
    price: entry.price ?? entry.course?.price ?? 0,
    notes: entry.notes ?? undefined,
    modifiableUntil: entry.modifiableUntil ? new Date(entry.modifiableUntil) : undefined,
    lastModified: entry.updatedAt ? new Date(entry.updatedAt) : undefined,
    createdAt: entry.createdAt ? new Date(entry.createdAt) : new Date(),
    updatedAt: entry.updatedAt ? new Date(entry.updatedAt) : new Date(),
    customerName: entry.customer?.name,
    staffName: entry.cast?.name || entry.staffName,
    serviceName: entry.course?.name || entry.service?.name,
    designationType: entry.designationType ?? undefined,
    designationFee: entry.designationFee ?? undefined,
    transportationFee: entry.transportationFee ?? undefined,
    additionalFee: entry.additionalFee ?? undefined,
    discountAmount: entry.discountAmount ?? undefined,
    welfareExpense: entry.welfareExpense ?? undefined,
    paymentMethod: entry.paymentMethod ?? undefined,
    marketingChannel: entry.marketingChannel ?? undefined,
    storeRevenue: entry.storeRevenue ?? undefined,
    staffRevenue: entry.staffRevenue ?? undefined,
    areaId: entry.areaId ?? entry.area?.id ?? null,
    areaName: entry.area?.name ?? undefined,
    areaPrefecture: entry.area?.prefecture ?? undefined,
    areaCity: entry.area?.city ?? undefined,
    stationId: entry.stationId ?? entry.station?.id ?? null,
    stationName: entry.station?.name ?? undefined,
    stationTravelTime: entry.station?.travelTime ?? undefined,
    locationMemo: entry.locationMemo ?? undefined,
    castCheckedInAt: entry.castCheckedInAt ? new Date(entry.castCheckedInAt) : undefined,
    castCheckedOutAt: entry.castCheckedOutAt ? new Date(entry.castCheckedOutAt) : undefined,
    options: Array.isArray(entry.options) ? entry.options : undefined,
  }
}

function buildUrl(path: string): URL {
  const resolved = resolveApiUrl(path)
  if (resolved.startsWith('http')) {
    return new URL(resolved)
  }

  if (typeof window !== 'undefined') {
    return new URL(resolved, window.location.origin)
  }

  return new URL(resolved, 'http://localhost')
}

function withDisplayName(reservation: Reservation, fallback?: string): Reservation {
  const name = reservation.customerName?.trim()
  if (name && name.length > 0) {
    return reservation
  }

  const idFragment = reservation.customerId ? reservation.customerId.slice(0, 8) : ''
  const generated = fallback ?? (reservation.customerId ? `顧客${idFragment}` : '顧客')
  return {
    ...reservation,
    customerName: generated,
  }
}

async function enrichCustomerNames(reservations: Reservation[]): Promise<Reservation[]> {
  const missingIds = Array.from(
    new Set(
      reservations
        .filter((reservation) => !reservation.customerName || reservation.customerName.trim().length === 0)
        .map((reservation) => reservation.customerId)
        .filter(Boolean)
    )
  )

  if (missingIds.length === 0) {
    return reservations.map((reservation) => withDisplayName(reservation))
  }

  const nameMap = new Map<string, string>()

  await Promise.all(
    missingIds.map(async (customerId) => {
      try {
        const response = await fetch(buildUrl(`/api/customer?id=${customerId}`).toString(), {
          credentials: 'include',
          cache: 'no-store',
        })

        if (!response.ok) {
          return
        }

        const customer = await response.json()
        if (customer?.name) {
          nameMap.set(customerId, customer.name)
        }
      } catch (error) {
        logWarning('Failed to enrich customer name', { err: error, customerId })
      }
    })
  )

  return reservations.map((reservation) =>
    withDisplayName(reservation, reservation.customerId ? nameMap.get(reservation.customerId) : undefined)
  )
}

async function requestReservations(query: ReservationQuery = {}): Promise<Reservation[]> {
  const url = buildUrl(RESERVATION_API_PATH)

  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.append(key, String(value))
    }
  })

  const response = await fetch(url.toString(), {
    credentials: 'include',
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch reservations: ${response.statusText}`)
  }

  const payload = await response.json()
  if (Array.isArray(payload)) {
    return payload.map(normalizeReservation)
  }
  return []
}

async function requestReservationMutation(
  method: 'POST' | 'PUT' | 'DELETE',
  body?: Record<string, unknown>,
  id?: string,
  storeId?: string
): Promise<Reservation | null> {
  const targetPath = id ? `${RESERVATION_API_PATH}?id=${id}` : RESERVATION_API_PATH
  const targetUrl = buildUrl(targetPath)
  if (storeId) {
    targetUrl.searchParams.set('storeId', storeId)
  }
  const response = await fetch(targetUrl.toString(), {
    method,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  if (!response.ok) {
    const message = await response.text().catch(() => response.statusText)
    throw new Error(message || 'Reservation API request failed')
  }

  if (response.status === 204) {
    return null
  }

  const payload = await response.json()
  return payload ? normalizeReservation(payload) : null
}

export async function getReservationsByCustomerId(customerId: string): Promise<Reservation[]> {
  try {
    const reservations = await requestReservations({ customerId })
    return enrichCustomerNames(reservations)
  } catch (error) {
    if (!shouldUseMockFallbacks()) {
      throw error
    }
    logWarning('Falling back to mock reservations for customer', { err: error })
    const fallbackReservations = await getMockReservationsByCustomerId(customerId)
    return enrichCustomerNames(fallbackReservations)
  }
}

export async function getAllReservations(params?: ReservationQuery): Promise<Reservation[]> {
  try {
    const reservations = await requestReservations(params)
    return enrichCustomerNames(reservations)
  } catch (error) {
    if (!shouldUseMockFallbacks()) {
      throw error
    }
    logWarning('Falling back to mock reservations list', { err: error })
    const fallbackReservations = await getAllMockReservations()
    return enrichCustomerNames(fallbackReservations)
  }
}

export async function updateReservation(
  id: string,
  updates: Partial<Reservation>,
  storeId?: string
): Promise<Reservation | null> {
  try {
    const updated = await requestReservationMutation('PUT', { id, ...updates }, id, storeId)
    if (!updated) {
      return null
    }
    const [enriched] = await enrichCustomerNames([updated])
    return enriched
  } catch (error) {
    if (!shouldUseMockFallbacks()) {
      throw error
    }
    logWarning('Falling back to mock reservation update', { err: error })
    updateMockReservation(id, updates)
    const reservations = await getAllMockReservations()
    const enriched = await enrichCustomerNames(reservations)
    return enriched.find((reservation) => reservation.id === id) || null
  }
}

export async function addReservation(
  reservation: Omit<Reservation, 'id' | 'createdAt' | 'updatedAt'>,
  storeId?: string
): Promise<Reservation> {
  try {
    const created = await requestReservationMutation('POST', reservation, undefined, storeId)
    if (!created) {
      throw new Error('Reservation API returned empty response')
    }
    const [enriched] = await enrichCustomerNames([created])
    return enriched
  } catch (error) {
    if (!shouldUseMockFallbacks()) {
      throw error
    }
    logWarning('Falling back to mock reservation creation', { err: error })
    const created = addMockReservation(reservation)
    const enriched = await enrichCustomerNames([created])
    return enriched[0]
  }
}
