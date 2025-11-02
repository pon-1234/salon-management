import type { Store } from './types'

export interface PublicBannerItem {
  id: string
  title: string
  imageUrl: string
  mobileImageUrl: string
  link: string
}

export interface PublicCastSummary {
  id: string
  name: string
  age: number | null
  height: number | null
  bust: string | null
  waist: number | null
  hip: number | null
  type: string | null
  image: string | null
  images: string[]
  panelDesignationRank: number
  regularDesignationRank: number
  netReservation: boolean
  workStatus: string | null
  sizeLabel: string
}

export interface PublicScheduleSummary {
  castId: string
  castName: string
  startTime: string
  endTime: string
  cast: PublicCastSummary
}

export interface PublicReviewSummary {
  id: string
  castId: string
  castName: string
  rating: number
  comment: string
  createdAt: string
  customerAlias: string
  area?: string | null
}

export interface PublicStoreHomeHighlights {
  ranking: PublicCastSummary[]
  newcomers: PublicCastSummary[]
  todaysSchedules: PublicScheduleSummary[]
}

export interface PublicStoreHomeData {
  store: Store
  banners: PublicBannerItem[]
  highlights: PublicStoreHomeHighlights
  reviews: PublicReviewSummary[]
}
