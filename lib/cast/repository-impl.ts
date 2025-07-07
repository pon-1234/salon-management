/**
 * @design_doc   Cast repository implementation using API client
 * @related_to   CastRepository, Cast API endpoints, fetch API
 * @known_issues None currently
 */
import { Cast, CastSchedule } from './types'
import { CastRepository } from './repository'

export class CastRepositoryImpl implements CastRepository {
  private baseUrl = '/api'

  async findAll(): Promise<Cast[]> {
    const response = await fetch(`${this.baseUrl}/cast`)
    if (!response.ok) {
      throw new Error(`Failed to fetch casts: ${response.statusText}`)
    }
    return response.json()
  }

  async findById(id: string): Promise<Cast | null> {
    const response = await fetch(`${this.baseUrl}/cast?id=${id}`)
    if (response.status === 404) {
      return null
    }
    if (!response.ok) {
      throw new Error(`Failed to fetch cast: ${response.statusText}`)
    }
    return response.json()
  }

  async create(data: Omit<Cast, 'id' | 'createdAt' | 'updatedAt'>): Promise<Cast> {
    const response = await fetch(`${this.baseUrl}/cast`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })
    if (!response.ok) {
      throw new Error(`Failed to create cast: ${response.statusText}`)
    }
    return response.json()
  }

  async update(id: string, data: Partial<Cast>): Promise<Cast> {
    const response = await fetch(`${this.baseUrl}/cast`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ id, ...data }),
    })
    if (!response.ok) {
      throw new Error(`Failed to update cast: ${response.statusText}`)
    }
    return response.json()
  }

  async delete(id: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/cast?id=${id}`, {
      method: 'DELETE',
    })
    if (!response.ok) {
      throw new Error(`Failed to delete cast: ${response.statusText}`)
    }
  }

  async getCastSchedule(castId: string, startDate: Date, endDate: Date): Promise<CastSchedule[]> {
    const params = new URLSearchParams({
      castId,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    })
    
    const response = await fetch(`${this.baseUrl}/cast-schedule?${params}`)
    if (!response.ok) {
      throw new Error(`Failed to fetch cast schedule: ${response.statusText}`)
    }
    return response.json()
  }

  async updateCastSchedule(castId: string, schedule: CastSchedule[]): Promise<void> {
    // First, get existing schedules to update/create/delete
    const existingSchedules = await this.getCastSchedule(
      castId, 
      new Date(Math.min(...schedule.map(s => s.date.getTime()))),
      new Date(Math.max(...schedule.map(s => s.date.getTime())))
    )

    // Update each schedule item
    for (const item of schedule) {
      const existing = existingSchedules.find(s => 
        s.castId === item.castId && 
        s.date.toDateString() === item.date.toDateString()
      )

      if (existing) {
        // Update existing schedule
        const response = await fetch(`${this.baseUrl}/cast-schedule`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            id: (existing as any).id,
            ...item,
          }),
        })
        if (!response.ok) {
          throw new Error(`Failed to update cast schedule: ${response.statusText}`)
        }
      } else {
        // Create new schedule
        const response = await fetch(`${this.baseUrl}/cast-schedule`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(item),
        })
        if (!response.ok) {
          throw new Error(`Failed to create cast schedule: ${response.statusText}`)
        }
      }
    }
  }
}
