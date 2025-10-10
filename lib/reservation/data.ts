import { Reservation } from '@/lib/types/reservation'
import { resolveApiUrl } from '@/lib/http/base-url'
import {
  addMockReservation,
  getAllMockReservations,
  getMockReservationsByCustomerId,
  updateMockReservation,
} from './mock-data'

let cachedLogger: any = undefined

function logWarning(message: string, details?: unknown) {
  if (typeof window !== 'undefined') {
    console.warn(message, details)
    return
  }

  if (cachedLogger === undefined) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
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
}

function normalizeReservation(entry: any): Reservation {
  return {
    id: entry.id,
    customerId: entry.customerId,
    staffId: entry.staffId || entry.castId || '',
    serviceId: entry.serviceId || entry.courseId || '',
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
  }
}

async function requestReservations(query: ReservationQuery = {}): Promise<Reservation[]> {
  const url = new URL(resolveApiUrl(RESERVATION_API_PATH))

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
  id?: string
): Promise<Reservation | null> {
  const targetUrl = id ? `${RESERVATION_API_PATH}?id=${id}` : RESERVATION_API_PATH
  const response = await fetch(resolveApiUrl(targetUrl), {
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
    return await requestReservations({ customerId })
  } catch (error) {
    logWarning('Falling back to mock reservations for customer', { err: error })
    return getMockReservationsByCustomerId(customerId)
  }
}

export async function getAllReservations(params?: ReservationQuery): Promise<Reservation[]> {
  try {
    return await requestReservations(params)
  } catch (error) {
    logWarning('Falling back to mock reservations list', { err: error })
    return getAllMockReservations()
  }
}

export async function updateReservation(
  id: string,
  updates: Partial<Reservation>
): Promise<Reservation | null> {
  try {
    return await requestReservationMutation('PUT', { id, ...updates })
  } catch (error) {
    logWarning('Falling back to mock reservation update', { err: error })
    updateMockReservation(id, updates)
    const reservations = await getAllMockReservations()
    return reservations.find((reservation) => reservation.id === id) || null
  }
}

export async function addReservation(
  reservation: Omit<Reservation, 'id' | 'createdAt' | 'updatedAt'>
): Promise<Reservation> {
  try {
    const created = await requestReservationMutation('POST', reservation)
    if (!created) {
      throw new Error('Reservation API returned empty response')
    }
    return created
  } catch (error) {
    logWarning('Falling back to mock reservation creation', { err: error })
    return addMockReservation(reservation)
  }
}
