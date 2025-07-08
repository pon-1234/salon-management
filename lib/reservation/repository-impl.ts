/**
 * @design_doc   Reservation repository implementation using API client
 * @related_to   ReservationRepository, Reservation API endpoints, fetch API
 * @known_issues None currently
 */
import { ReservationRepository } from './repository'
import { Reservation, Service } from '../types/reservation'

export class ReservationRepositoryImpl implements ReservationRepository {
  private baseUrl = '/api'

  async getAll(): Promise<Reservation[]> {
    const response = await fetch(`${this.baseUrl}/reservation`)
    if (!response.ok) {
      throw new Error(`Failed to fetch reservations: ${response.statusText}`)
    }
    return response.json()
  }

  async getById(id: string): Promise<Reservation | null> {
    const response = await fetch(`${this.baseUrl}/reservation?id=${id}`)
    if (response.status === 404) {
      return null
    }
    if (!response.ok) {
      throw new Error(`Failed to fetch reservation: ${response.statusText}`)
    }
    return response.json()
  }

  async create(data: Omit<Reservation, 'id' | 'createdAt' | 'updatedAt'>): Promise<Reservation> {
    const response = await fetch(`${this.baseUrl}/reservation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })

    const responseData = await response.json()

    if (!response.ok) {
      // Include conflict information if available
      if (response.status === 409 && responseData.conflicts) {
        const error = new Error(responseData.error || 'Time slot is not available')
        ;(error as any).conflicts = responseData.conflicts
        ;(error as any).status = 409
        throw error
      }
      throw new Error(responseData.error || `Failed to create reservation: ${response.statusText}`)
    }

    return responseData
  }

  async update(id: string, data: Partial<Reservation>): Promise<Reservation> {
    const response = await fetch(`${this.baseUrl}/reservation`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ id, ...data }),
    })

    const responseData = await response.json()

    if (!response.ok) {
      // Include conflict information if available
      if (response.status === 409 && responseData.conflicts) {
        const error = new Error(responseData.error || 'Time slot is not available')
        ;(error as any).conflicts = responseData.conflicts
        ;(error as any).status = 409
        throw error
      }
      throw new Error(responseData.error || `Failed to update reservation: ${response.statusText}`)
    }

    return responseData
  }

  async delete(id: string): Promise<boolean> {
    const response = await fetch(`${this.baseUrl}/reservation?id=${id}`, {
      method: 'DELETE',
    })

    if (!response.ok) {
      const responseData = await response.json()
      throw new Error(responseData.error || `Failed to delete reservation: ${response.statusText}`)
    }

    // The API now returns the cancelled reservation, but we return true for backward compatibility
    return true
  }

  async getReservationsByCustomer(customerId: string): Promise<Reservation[]> {
    const response = await fetch(`${this.baseUrl}/reservation?customerId=${customerId}`)
    if (!response.ok) {
      throw new Error(`Failed to fetch customer reservations: ${response.statusText}`)
    }
    return response.json()
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

    const response = await fetch(`${this.baseUrl}/reservation?${params}`)
    if (!response.ok) {
      throw new Error(`Failed to fetch staff reservations: ${response.statusText}`)
    }
    return response.json()
  }

  async getServices(): Promise<Service[]> {
    // This would map to course/option services from the Course and Option APIs
    const [coursesResponse, optionsResponse] = await Promise.all([
      fetch(`${this.baseUrl}/course`),
      fetch(`${this.baseUrl}/option`),
    ])

    if (!coursesResponse.ok || !optionsResponse.ok) {
      throw new Error('Failed to fetch services')
    }

    const [courses, options] = await Promise.all([coursesResponse.json(), optionsResponse.json()])

    // Transform courses and options into Service format
    const services: Service[] = [
      ...courses.map((course: any) => ({
        id: course.id,
        name: course.name,
        type: 'course' as const,
        duration: course.duration,
        price: course.price,
        description: course.description,
      })),
      ...options.map((option: any) => ({
        id: option.id,
        name: option.name,
        type: 'option' as const,
        duration: 0, // Options don't have duration
        price: option.price,
        description: '',
      })),
    ]

    return services
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

    const response = await fetch(`${this.baseUrl}/reservation/availability/check?${params}`)
    if (!response.ok) {
      throw new Error(`Failed to check availability: ${response.statusText}`)
    }
    return response.json()
  }

  async getAvailableSlots(
    castId: string,
    date: Date,
    duration: number
  ): Promise<{ startTime: string; endTime: string }[]> {
    const params = new URLSearchParams({
      castId,
      date: date.toISOString(),
      duration: duration.toString(),
    })

    const response = await fetch(`${this.baseUrl}/reservation/availability?${params}`)
    if (!response.ok) {
      throw new Error(`Failed to get available slots: ${response.statusText}`)
    }

    const data = await response.json()
    return data.availableSlots || []
  }
}
