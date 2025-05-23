import { Cast, CastSchedule } from './types';
import { CastRepository } from './repository';

export class CastUseCases {
  constructor(private repository: CastRepository) {}

  async getCast(id: string): Promise<Cast | null> {
    return this.repository.getCast(id);
  }

  async getAllCasts(): Promise<Cast[]> {
    return this.repository.getAllCasts();
  }

  async createCast(cast: Omit<Cast, 'id'>): Promise<Cast> {
    return this.repository.createCast(cast);
  }

  async updateCast(id: string, cast: Partial<Cast>): Promise<Cast> {
    return this.repository.updateCast(id, cast);
  }

  async deleteCast(id: string): Promise<void> {
    return this.repository.deleteCast(id);
  }

  async getCastSchedule(castId: string, startDate: Date, endDate: Date): Promise<CastSchedule[]> {
    return this.repository.getCastSchedule(castId, startDate, endDate);
  }

  async updateCastSchedule(castId: string, schedule: CastSchedule[]): Promise<void> {
    return this.repository.updateCastSchedule(castId, schedule);
  }
}
