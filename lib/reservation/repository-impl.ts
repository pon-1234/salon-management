/**
 * @design_doc   Reservation repository implementation using API client
 * @related_to   ReservationRepository, Reservation API endpoints, fetch API
 * @known_issues None currently
 */
import { ReservationRepository } from './repository'
import { Reservation, Service } from '../types/reservation'

export class ReservationRepositoryImpl implements ReservationRepository {
  private baseUrl = '/api'

  async findAll(): Promise<Reservation[]> {
    const response = await fetch(`${this.baseUrl}/reservation`)
    if (!response.ok) {
      throw new Error(`Failed to fetch reservations: ${response.statusText}`)
    }
    return response.json()
  }

  async findById(id: string): Promise<Reservation | null> {
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
    if (!response.ok) {
      throw new Error(`Failed to create reservation: ${response.statusText}`)
    }
    return response.json()
  }

  async update(id: string, data: Partial<Reservation>): Promise<Reservation> {
    const response = await fetch(`${this.baseUrl}/reservation`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ id, ...data }),
    })
    if (!response.ok) {
      throw new Error(`Failed to update reservation: ${response.statusText}`)
    }
    return response.json()
  }

  async delete(id: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/reservation?id=${id}`, {
      method: 'DELETE',
    })
    if (!response.ok) {
      throw new Error(`Failed to delete reservation: ${response.statusText}`)
    }
  }

  async getReservationsByCustomer(customerId: string): Promise<Reservation[]> {
    const response = await fetch(`${this.baseUrl}/reservation?customerId=${customerId}`)
    if (!response.ok) {
      throw new Error(`Failed to fetch customer reservations: ${response.statusText}`)
    }
    return response.json()
  }

  async getReservationsByStaff(staffId: string, startDate: Date, endDate: Date): Promise<Reservation[]> {
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

    const [courses, options] = await Promise.all([
      coursesResponse.json(),
      optionsResponse.json(),
    ])

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
}