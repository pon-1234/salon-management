import { WeeklySchedule, ScheduleFilters } from './types';
import { generateMockWeeklySchedule } from './data';

export class CastScheduleUseCases {
  async getWeeklySchedule(filters: ScheduleFilters): Promise<WeeklySchedule> {
    // In a real application, this would fetch from an API
    return generateMockWeeklySchedule(filters.date);
  }

  async updateSchedule(castId: string, date: string, status: string, time?: { start: string; end: string }): Promise<void> {
    // In a real application, this would update via an API
    console.log('Updating schedule:', { castId, date, status, time });
  }
}
