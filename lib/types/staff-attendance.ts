export interface StaffAttendance {
  id: string
  name: string
  attendance: (1 | 0)[]  // 1 for present, 0 for absent
  total: number
}

export interface StaffAttendanceFilters {
  year: number
  month: number
  status?: string
  staffId?: string
}
