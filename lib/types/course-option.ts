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
  isPopular?: boolean
  note?: string
}
