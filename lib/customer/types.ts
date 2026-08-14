/**
 * @design_doc   docs/LEGACY_DATA_MIGRATION_RUNBOOK.md customer data verification
 * @related_to   CustomerRepository and customer admin pages consume these domain records
 * @known_issues Point-event history remains separate from the customer aggregate
 */
import { BaseEntity } from '../shared'
import type { Reservation } from '../types/reservation'

export type CustomerAccountStatus = 'pending' | 'active' | 'withdrawn' | 'blocked' | 'unknown'
export type CustomerMembershipStage = 'regular' | 'silver' | 'gold' | 'platinum' | 'god' | 'unknown'

export interface NgCastEntry {
  castId: string
  notes?: string
  addedDate: Date
  assignedBy?: 'customer' | 'cast' | 'staff'
}

export interface Customer extends BaseEntity {
  name: string
  nameKana?: string
  phone: string
  email: string
  password: string
  birthDate: Date
  age: number
  memberType: 'regular' | 'vip'
  accountStatus: CustomerAccountStatus
  membershipStage: CustomerMembershipStage
  smsEnabled: boolean
  emailNotificationEnabled: boolean
  phoneVerified?: boolean
  phoneVerifiedAt?: Date
  points: number
  registrationDate: Date
  lastLoginDate?: Date
  lastVisitDate?: Date
  notes?: string
  ngCastIds?: string[]
  ngCasts?: NgCastEntry[]
  image?: string
  visitCount?: number
  lastVisit?: Date
  reservations?: Reservation[]
}

export interface CustomerUsageRecord {
  id: string
  date: Date
  serviceName: string
  staffName: string
  amount: number
  status: 'completed' | 'cancelled'
}

export interface CustomerPointHistory {
  id: string
  type: 'earned' | 'used' | 'expired' | 'adjusted'
  amount: number
  description: string
  relatedService?: string
  reservationId?: string | null
  expiresAt?: Date | null
  balance: number
  date: Date
}

export interface CustomerInsights {
  lastVisitDate: string | null
  lastCastName: string | null
  totalVisits: number
  totalRevenue: number
  averageSpend: number
  averageIntervalDays: number | null
  customerCancelCount: number
  storeCancelCount: number
  chatCountToday: number
  chatCountYesterday: number
  chatCountTotal: number
  preferredBustCup: string | null
  cancellationLimit: number
}
