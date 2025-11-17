/**
 * @design_doc   Point domain shared types
 * @related_to   CustomerPointHistory Prisma model, loyalty point APIs
 * @known_issues None currently
 */

export type PointHistoryType = 'earned' | 'used' | 'expired' | 'adjusted'

export interface PointTransaction {
  customerId: string
  type: PointHistoryType
  amount: number
  description: string
  relatedService?: string
  reservationId?: string
  expiresAt?: Date
  sourceHistoryId?: string
}

export interface PointConfig {
  earnRate: number
  expirationMonths: number
  minPointsToUse: number
}

export const DEFAULT_POINT_CONFIG: PointConfig = {
  earnRate: 0.01,
  expirationMonths: 12,
  minPointsToUse: 100,
}
