import { Reservation } from '@/lib/types/reservation'
import { resolveApiUrl } from '@/lib/http/base-url'
import logger from '@/lib/logger'
import {
  addMockReservation,
  getAllMockReservations,
  getMockReservationsByCustomerId,
  updateMockReservation,
} from './mock-data'

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
    logger.warn({ err: error }, 'Falling back to mock reservations for customer')
    return getMockReservationsByCustomerId(customerId)
  }
}

export async function getAllReservations(params?: ReservationQuery): Promise<Reservation[]> {
  try {
    return await requestReservations(params)
  } catch (error) {
    logger.warn({ err: error }, 'Falling back to mock reservations list')
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
    logger.warn({ err: error }, 'Falling back to mock reservation update')
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
    logger.warn({ err: error }, 'Falling back to mock reservation creation')
    return addMockReservation(reservation)
  }
}
