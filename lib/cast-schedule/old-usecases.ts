import { WeeklySchedule, ScheduleFilters } from './old-types'
import { generateMockWeeklySchedule } from './old-data'
import { startOfWeek } from 'date-fns'

export class CastScheduleUseCases {
  async getWeeklySchedule(filters: ScheduleFilters): Promise<WeeklySchedule> {
    // In a real application, this would fetch from an API
    // Ensure we always start from Monday
    const weekStart = startOfWeek(filters.date, { weekStartsOn: 1 })
    return generateMockWeeklySchedule(weekStart)
  }

  async updateSchedule(
    castId: string,
    date: string,
    status: string,
    time?: { start: string; end: string }
  ): Promise<void> {
    // In a real application, this would update via an API
    console.log('Updating schedule:', { castId, date, status, time })
  }
}
