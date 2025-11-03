import { BaseEntity } from '../shared'

export type ReviewStatus = 'pending' | 'published' | 'hidden'

export interface Review extends BaseEntity {
  storeId: string
  reservationId?: string | null
  castId: string
  castName: string
  customerId: string
  customerName?: string | null
  customerAlias: string
  customerArea?: string | null
  rating: number
  comment: string
  visitDate: Date
  courseName?: string | null
  options?: string[]
  isVerified: boolean
  helpful?: number
  tags?: string[]
  response?: {
    content: string
    respondedAt: Date
    respondedBy: string
  }
  status: ReviewStatus
  publishedAt?: Date | null
}

export interface ReviewStats {
  totalReviews: number
  averageRating: number
  ratingDistribution: {
    5: number
    4: number
    3: number
    2: number
    1: number
  }
  popularTags: Array<{
    tag: string
    count: number
  }>
}
