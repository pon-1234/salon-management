import { Repository } from '../shared'
import { Cast, CastSchedule } from './types'

export interface CastRepository extends Repository<Cast> {
  getCastSchedule(castId: string, startDate: Date, endDate: Date): Promise<CastSchedule[]>
  updateCastSchedule(castId: string, schedule: CastSchedule[]): Promise<void>
}
