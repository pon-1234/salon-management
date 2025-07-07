import { BaseEntity } from '../shared'

export interface Review extends BaseEntity {
  storeId: string
  castName: string
  castId?: string
  customerName?: string
  customerArea?: string
  rating: number
  title?: string
  content: string
  visitDate: Date
  courseType?: string
  options?: string[]
  isVerified?: boolean
  helpful?: number
  images?: string[]
  tags?: string[]
  response?: {
    content: string
    respondedAt: Date
    respondedBy: string
  }
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
