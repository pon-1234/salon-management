import { BaseUseCasesImpl } from '../shared'
import { Cast, CastSchedule } from './types'
import { CastRepository } from './repository'

export class CastUseCases extends BaseUseCasesImpl<Cast> {
  constructor(private castRepository: CastRepository) {
    super(castRepository)
  }

  async getCastSchedule(castId: string, startDate: Date, endDate: Date): Promise<CastSchedule[]> {
    return this.castRepository.getCastSchedule(castId, startDate, endDate)
  }

  async updateCastSchedule(castId: string, schedule: CastSchedule[]): Promise<void> {
    return this.castRepository.updateCastSchedule(castId, schedule)
  }
}
