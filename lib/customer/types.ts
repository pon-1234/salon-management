import { BaseEntity } from '../shared'

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
