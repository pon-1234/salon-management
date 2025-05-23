import { Cast, CastSchedule } from './types';

export interface CastRepository {
  getCast(id: string): Promise<Cast | null>;
  getAllCasts(): Promise<Cast[]>;
  createCast(cast: Omit<Cast, 'id'>): Promise<Cast>;
  updateCast(id: string, cast: Partial<Cast>): Promise<Cast>;
  deleteCast(id: string): Promise<void>;
  getCastSchedule(castId: string, startDate: Date, endDate: Date): Promise<CastSchedule[]>;
  updateCastSchedule(castId: string, schedule: CastSchedule[]): Promise<void>;
}
