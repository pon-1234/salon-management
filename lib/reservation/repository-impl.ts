/**
 * @design_doc   Reservation repository implementation using API client
 * @related_to   ReservationRepository, Reservation API endpoints, fetch API
 * @known_issues None currently
 */
import { formatInTimeZone } from 'date-fns-tz'
import { ReservationRepository } from './repository'
import { Reservation, Service } from '../types/reservation'
import { ApiClient, ApiError, defaultApiClient } from '@/lib/http/api-client'

const RESERVATION_ENDPOINT = '/api/reservation'
const COURSE_ENDPOINT = '/api/course'
const OPTION_ENDPOINT = '/api/option'
const AVAILABILITY_ENDPOINT = '/api/reservation/availability'
const JST_TIMEZONE = 'Asia/Tokyo'

function normalizeApiError(error: ApiError): ApiError {
  const body = (error.body ?? null) as { error?: string; conflicts?: unknown } | null
  if (!body || typeof body !== 'object') {
    return error
  }

  const normalized = new ApiError(body.error ?? error.message, error.status, body)
  if (body.conflicts) {
    ;(normalized as any).conflicts = body.conflicts
  }
  return normalized
}

export class ReservationRepositoryImpl implements ReservationRepository {
  constructor(
    private readonly client: ApiClient = defaultApiClient,
    private readonly storeId?: string
  ) {}

  private withStore(path: string): string {
    if (!this.storeId) {
      return path
    }
    const separator = path.includes('?') ? '&' : '?'
    return `${path}${separator}storeId=${encodeURIComponent(this.storeId)}`
  }

  async getAll(): Promise<Reservation[]> {
    return this.client.get<Reservation[]>(this.withStore(RESERVATION_ENDPOINT))
  }

  async getById(id: string): Promise<Reservation | null> {
    try {
      const params = new URLSearchParams({ id })
      if (this.storeId) {
        params.set('storeId', this.storeId)
      }
      return await this.client.get<Reservation>(
        `${RESERVATION_ENDPOINT}?${params.toString()}`
      )
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        return null
      }
      throw error
    }
  }

  async create(data: Omit<Reservation, 'id' | 'createdAt' | 'updatedAt'>): Promise<Reservation> {
    try {
      return await this.client.post<Reservation>(this.withStore(RESERVATION_ENDPOINT), data)
    } catch (error) {
      if (error instanceof ApiError) {
        throw normalizeApiError(error)
      }
      throw error
    }
  }

  async update(id: string, data: Partial<Reservation>): Promise<Reservation> {
    try {
      return await this.client.put<Reservation>(this.withStore(RESERVATION_ENDPOINT), {
        id,
        ...data,
      })
    } catch (error) {
      if (error instanceof ApiError) {
        throw normalizeApiError(error)
      }
      throw error
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      await this.client.delete(this.withStore(`${RESERVATION_ENDPOINT}?id=${encodeURIComponent(id)}`), {
        parseJson: false,
      })
      return true
    } catch (error) {
      if (error instanceof ApiError) {
        throw normalizeApiError(error)
      }
      throw error
    }
  }

  async getReservationsByCustomer(customerId: string): Promise<Reservation[]> {
    const params = new URLSearchParams({ customerId })
    if (this.storeId) {
      params.set('storeId', this.storeId)
    }
    return this.client.get<Reservation[]>(`${RESERVATION_ENDPOINT}?${params.toString()}`)
  }

  async getReservationsByStaff(
    staffId: string,
    startDate: Date,
    endDate: Date
  ): Promise<Reservation[]> {
    const params = new URLSearchParams({
      castId: staffId,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    })
    if (this.storeId) {
      params.set('storeId', this.storeId)
    }

    return this.client.get<Reservation[]>(`${RESERVATION_ENDPOINT}?${params.toString()}`)
  }

  async getServices(): Promise<Service[]> {
    const [courses, options] = await Promise.all([
      this.client.get<any[]>(this.withStore(COURSE_ENDPOINT)),
      this.client.get<any[]>(this.withStore(OPTION_ENDPOINT)),
    ])

    return [
      ...courses.map((course) => ({
        id: course.id,
        name: course.name,
        type: 'course' as const,
        duration: course.duration,
        price: course.price,
        description: course.description,
      })),
      ...options.map((option) => ({
        id: option.id,
        name: option.name,
        type: 'option' as const,
        duration: 0,
        price: option.price,
        description: '',
      })),
    ]
  }

  async checkAvailability(
    castId: string,
    startTime: Date,
    endTime: Date
  ): Promise<{ available: boolean; conflicts?: any[] }> {
    const params = new URLSearchParams({
      castId,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
    })
    params.set('mode', 'check')
    if (this.storeId) {
      params.set('storeId', this.storeId)
    }

    return this.client.get<{ available: boolean; conflicts?: any[] }>(
      `${AVAILABILITY_ENDPOINT}?${params.toString()}`
    )
  }

  async getAvailableSlots(
    castId: string,
    date: Date,
    duration: number
  ): Promise<{ startTime: string; endTime: string }[]> {
    const params = new URLSearchParams({
      castId,
      date: formatInTimeZone(date, JST_TIMEZONE, 'yyyy-MM-dd'),
      duration: duration.toString(),
    })
    if (this.storeId) {
      params.set('storeId', this.storeId)
    }

    const payload = await this.client.get<{ availableSlots?: { startTime: string; endTime: string }[] }>(
      `${AVAILABILITY_ENDPOINT}?${params.toString()}`
    )

    return payload?.availableSlots ?? []
  }
}
