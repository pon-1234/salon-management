export interface HourlySalesData {
  date: number
  dayOfWeek: string
  hours: number[]
  total: number
}

export interface TimeSlotSummary {
  range: string
  count: number
  percentage: number
}

export interface HourlySalesReport {
  year: number
  month: number
  data: HourlySalesData[]
  hourlyTotals: number[]
  grandTotal: number
  timeSlots: TimeSlotSummary[]
}
