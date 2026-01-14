import type { Reservation } from '@prisma/client'

export type CastReservationScope = 'upcoming' | 'past' | 'today'

export interface CastPortalReservation {
  id: string
  status: string
  startTime: string
  endTime: string
  durationMinutes: number
  courseName: string | null
  courseDuration: number | null
  customerAlias: string
  location?: string | null
  areaName?: string | null
  designationType?: Reservation['designationType']
  designationFee?: number
  transportationFee?: number
  additionalFee?: number
  discountAmount?: number
  checkedInAt: string | null
  checkedOutAt: string | null
  canCheckIn: boolean
  canCheckOut: boolean
  options: Array<{
    id: string
    name: string
    price: number
  }>
}

export interface CastAttendanceRequestSummary {
  id: string
  reservationId: string
  status: string
  type: string
  requestedTime: string
  createdAt: string
  reason?: string | null
}

export interface CastDashboardStats {
  todayCount: number
  completedToday: number
  upcomingCount: number
  todayRevenue: number
  monthRevenue: number
  welfareThisMonth: number
  pendingRequests: number
}

export interface CastAttendanceState {
  currentReservationId: string | null
  canCheckIn: boolean
  canCheckOut: boolean
  lastCheckInAt: string | null
  lastCheckOutAt: string | null
}

export interface CastDashboardData {
  cast: {
    id: string
    name: string
    image: string | null
    workStatus: string
    storeId: string
    storeName: string | null
    requestAttendanceEnabled?: boolean
  }
  nextReservation: CastPortalReservation | null
  todayReservations: CastPortalReservation[]
  stats: CastDashboardStats
  attendance: CastAttendanceState
  attendanceRequests: CastAttendanceRequestSummary[]
  isScheduledToday: boolean
}

export interface CastRankingMetric {
  label: string
  rank: number | null
  count: number | null
}

export interface CastPerformanceSnapshot {
  cast: {
    id: string
    name: string
    storeId: string
    storeName: string | null
  }
  periodLabel: string
  totalCastCount: number
  totalDesignation: CastRankingMetric
  regularDesignation: CastRankingMetric
  access: CastRankingMetric
}

export interface CastReservationListResponse {
  items: CastPortalReservation[]
  meta: {
    scope: CastReservationScope
    count: number
  }
}

export interface CastReservationDetail extends CastPortalReservation {
  customerPhone?: string
  marketingChannel?: string | null
  paymentMethod?: string | null
  designationFee?: number
  transportationFee?: number
  additionalFee?: number
  discountAmount?: number
  notes?: string | null
  areaMemo?: string | null
  locationMemo?: string | null
  hotelName?: string | null
  roomNumber?: string | null
  entryMemo?: string | null
  entryReceivedAt?: string | null
  entryReceivedBy?: string | null
  entryNotifiedAt?: string | null
  entryConfirmedAt?: string | null
  entryReminderSentAt?: string | null
  coursePrice?: number | null
  storeRevenue?: number | null
  staffRevenue?: number | null
}

export type CastScheduleLockReason = 'near_term' | 'has_reservations'

export interface CastScheduleEntry {
  id: string | null
  date: string // yyyy-MM-dd
  isAvailable: boolean
  startTime: string
  endTime: string
  canEdit: boolean
  hasReservations: boolean
  lockReasons: CastScheduleLockReason[]
}

export interface CastScheduleWindow {
  items: CastScheduleEntry[]
  meta: {
    startDate: string
    endDate: string
  }
}

export interface CastScheduleUpdateInput {
  date: string
  status: 'working' | 'off'
  startTime?: string
  endTime?: string
}

export interface CastSettlementSummary {
  month: string
  totalRevenue: number
  staffRevenue: number
  storeRevenue: number
  welfareExpense: number
  completedCount: number
  pendingCount: number
}

export interface CastSettlementRecordDetail {
  id: string
  startTime: string
  status: string
  courseName: string | null
  price: number
  staffRevenue: number
  storeRevenue: number
  welfareExpense: number
  options: Array<{
    id: string
    name: string
    price: number
    storeShare?: number
    castShare?: number
  }>
}

export interface CastSettlementDaySummary {
  date: string
  totalRevenue: number
  reservationCount: number
  records: CastSettlementRecordDetail[]
}

export interface CastSettlementsData {
  summary: CastSettlementSummary
  days: CastSettlementDaySummary[]
}
