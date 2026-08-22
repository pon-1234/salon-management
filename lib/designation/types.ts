import type { DesignationFeeKind } from './kind'

export interface DesignationFee {
  id: string
  name: string
  price: number
  storeShare: number
  castShare: number
  description?: string | null
  sortOrder: number
  isActive: boolean
  kind?: DesignationFeeKind
  createdAt?: string | Date | null
  updatedAt?: string | Date | null
}

export type DesignationFeeInput = Omit<DesignationFee, 'id' | 'createdAt' | 'updatedAt'>
