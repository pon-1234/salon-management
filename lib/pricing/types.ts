import { BaseEntity } from '../shared'

// Course pricing model
export interface CoursePrice extends BaseEntity {
  name: string
  description?: string | null
  duration: number
  price: number
  storeShare?: number | null
  castShare?: number | null
  isActive: boolean
  enableWebBooking: boolean
  archivedAt?: Date | null
}

// Option pricing model
export interface OptionPrice extends BaseEntity {
  name: string
  description?: string
  price: number
  duration?: number // additional time in minutes
  category: 'relaxation' | 'body-care' | 'extension' | 'special'
  displayOrder: number
  isActive: boolean
  visibility: 'public' | 'internal'
  isPopular?: boolean
  storeShare?: number
  castShare?: number
  note?: string | null
  archivedAt?: Date | null
}

// Additional fees model
export interface AdditionalFee extends BaseEntity {
  name: string
  type: 'fixed' | 'percentage' | 'range'
  value: number | { min: number; max: number }
  description?: string
  displayOrder: number
  isActive: boolean
}

// Store-specific pricing configuration
export interface StorePricing {
  storeId: string
  courses: CoursePrice[]
  options: OptionPrice[]
  additionalFees: AdditionalFee[]
  notes: string[]
  lastUpdated: Date
}

// Pricing sync status
export interface PricingSyncStatus {
  storeId: string
  lastSyncedAt: Date
  isSynced: boolean
  pendingChanges: number
}
