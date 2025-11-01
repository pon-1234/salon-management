export interface StaffAttendanceSummary {
  id: string
  name: string
  attendance: (0 | 1)[]
  total: number
  weekdayAttendance: number
  weekendAttendance: number
  totalMinutes: number
}
