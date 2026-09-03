/**
 * @design_doc   Notion task #283 unified cast schedule statuses
 * @related_to   ScheduleEditDialog and CastScheduleUseCases share these presentation types
 * @known_issues None
 */
export const SCHEDULE_WORK_STATUSES = [
  '未入力',
  '出勤予定',
  '出勤中',
  '休日',
  '早退',
  '遅刻',
] as const

export type ScheduleWorkStatus = (typeof SCHEDULE_WORK_STATUSES)[number]

export interface CastScheduleStatus {
  type: ScheduleWorkStatus
  startTime?: string
  endTime?: string
  note?: string
  isAvailable?: boolean
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
  storeId: string
}
