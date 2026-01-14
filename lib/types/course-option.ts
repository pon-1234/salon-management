export interface Course {
  id: string
  name: string
  duration: number
  price: number
}

export interface Option {
  id: string
  name: string
  price: number
  description?: string
  duration?: number
  category?: string
  storeShare?: number | null
  castShare?: number | null
  isActive?: boolean
  visibility?: 'public' | 'internal'
  isPopular?: boolean
  note?: string
}
