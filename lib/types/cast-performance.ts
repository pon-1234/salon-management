/**
 * @design_doc   Cast-scoped completed-reservation analytics response contract
 * @related_to   getCastPerformanceReport and WorkPerformanceTab
 * @known_issues Attendance hours are intentionally excluded because reservations are not attendance records
 */

export interface CastPerformanceCountAmount {
  count: number
  amount: number
}

export interface CastPerformanceCourse {
  id: string
  name: string
  count: number
  reservationSales: number
}

export interface CastPerformanceOption {
  id: string
  name: string
  count: number
  sales: number
  selectionRate: number
}

export interface CastPerformanceReport {
  cast: {
    id: string
    name: string
  }
  period: {
    year: number
    month: number
    timeZone: 'Asia/Tokyo'
  }
  completedReservations: number
  reservationDays: number
  totalSales: number
  staffRevenue: number | null
  storeRevenue: number | null
  missingRevenue: {
    staff: number
    store: number
  }
  payments: {
    cash: CastPerformanceCountAmount
    card: CastPerformanceCountAmount
    unclassified: CastPerformanceCountAmount
  }
  customers: {
    new: number
    storeRepeat: number
    returningRegular: number
    unclassified: number
  }
  designations: {
    regular: number
    free: number
    none: number
    unclassified: number
  }
  marketing: {
    princess: number
    other: number
    unclassified: number
  }
  courses: CastPerformanceCourse[]
  options: CastPerformanceOption[]
}
