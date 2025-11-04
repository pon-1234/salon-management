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
  }
  nextReservation: CastPortalReservation | null
  todayReservations: CastPortalReservation[]
  stats: CastDashboardStats
  attendance: CastAttendanceState
  attendanceRequests: CastAttendanceRequestSummary[]
}

export interface CastReservationListResponse {
  items: CastPortalReservation[]
  meta: {
    scope: CastReservationScope
    count: number
  }
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

export interface CastSettlementRecord {
  id: string
  startTime: string
  status: string
  courseName: string | null
  price: number
  staffRevenue: number
  storeRevenue: number
  welfareExpense: number
}

export interface CastSettlementsData {
  summary: CastSettlementSummary
  recent: CastSettlementRecord[]
}
