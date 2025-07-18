import { BaseEntity } from '../shared'

export interface NgCastEntry {
  castId: string
  notes?: string
  addedDate: Date
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
  date: Date
  type: 'earned' | 'used' | 'expired' | 'adjusted'
  amount: number
  description: string
  relatedService?: string
  balance: number
}
