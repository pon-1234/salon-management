/**
 * @design_doc   Cast repository implementation using API client
 * @related_to   CastRepository, Cast API endpoints, fetch API
 * @known_issues None currently
 */
import { Cast, CastSchedule } from './types'
import { CastRepository } from './repository'
import { ApiClient, ApiError, defaultApiClient } from '@/lib/http/api-client'

const CAST_ENDPOINT = '/api/cast'
const CAST_SCHEDULE_ENDPOINT = '/api/cast-schedule'

function serializeScheduleInput(entry: CastSchedule) {
  return {
    ...entry,
    date: entry.date instanceof Date ? entry.date.toISOString() : entry.date,
  }
}

export class CastRepositoryImpl implements CastRepository {
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

  async getAll(): Promise<Cast[]> {
    return this.client.get<Cast[]>(this.withStore(CAST_ENDPOINT))
  }

  async getById(id: string): Promise<Cast | null> {
    try {
      const params = new URLSearchParams({ id })
      if (this.storeId) {
        params.set('storeId', this.storeId)
      }
      return await this.client.get<Cast>(`${CAST_ENDPOINT}?${params.toString()}`)
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        return null
      }
      throw error
    }
  }

  async create(data: Omit<Cast, 'id' | 'createdAt' | 'updatedAt'>): Promise<Cast> {
    return this.client.post<Cast>(this.withStore(CAST_ENDPOINT), data)
  }

  async update(id: string, data: Partial<Cast>): Promise<Cast> {
    return this.client.put<Cast>(this.withStore(CAST_ENDPOINT), { id, ...data })
  }

  async delete(id: string): Promise<boolean> {
    await this.client.delete(this.withStore(`${CAST_ENDPOINT}?id=${encodeURIComponent(id)}`), {
      parseJson: false,
    })
    return true
  }

  async getCastSchedule(castId: string, startDate: Date, endDate: Date): Promise<CastSchedule[]> {
    const params = new URLSearchParams({
      castId,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    })
    if (this.storeId) {
      params.set('storeId', this.storeId)
    }

    return this.client.get<CastSchedule[]>(`${CAST_SCHEDULE_ENDPOINT}?${params.toString()}`)
  }

  async updateCastSchedule(castId: string, schedule: CastSchedule[]): Promise<void> {
    if (schedule.length === 0) {
      return
    }

    const startBound = new Date(Math.min(...schedule.map((s) => s.date.getTime())))
    const endBound = new Date(Math.max(...schedule.map((s) => s.date.getTime())))

    const existingSchedules = await this.getCastSchedule(castId, startBound, endBound)

    for (const item of schedule) {
      const existing = existingSchedules.find(
        (entry) =>
          entry.castId === item.castId &&
          new Date(entry.date).toDateString() === item.date.toDateString()
      )

      if (existing && 'id' in existing && (existing as any).id) {
        await this.client.put(this.withStore(CAST_SCHEDULE_ENDPOINT), {
          id: (existing as any).id,
          ...serializeScheduleInput(item),
        })
      } else {
        await this.client.post(this.withStore(CAST_SCHEDULE_ENDPOINT), serializeScheduleInput(item))
      }
    }
  }
}
