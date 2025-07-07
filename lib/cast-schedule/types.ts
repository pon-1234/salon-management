export interface CastScheduleStatus {
  type: '休日' | '出勤予定' | '未入力'
  startTime?: string
  endTime?: string
  note?: string
}

export interface CastScheduleEntry {
  castId: string
  name: string
  nameKana: string
  age: number
  image: string
  hasPhone: boolean
  hasBusinessContact: boolean
  schedule: {
    [date: string]: CastScheduleStatus
  }
}

export interface WeeklySchedule {
  startDate: Date
  endDate: Date
  entries: CastScheduleEntry[]
  stats: {
    totalCast: number
    workingCast: number
    averageWorkingHours: number
    averageWorkingCast: number
  }
}

export interface ScheduleFilters {
  date: Date
  castFilter: string
}
