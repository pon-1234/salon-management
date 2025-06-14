export interface Store {
  id: string
  slug: string // URLパス用 (ikebukuro, shinjuku, etc.)
  name: string
  displayName: string
  address: string
  phone: string
  email: string
  openingHours: {
    weekday: { open: string; close: string }
    weekend: { open: string; close: string }
  }
  location: {
    lat: number
    lng: number
  }
  features: string[]
  images: {
    main: string
    gallery: string[]
  }
  theme?: {
    primaryColor: string
    secondaryColor: string
  }
  seoTitle?: string
  seoDescription?: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface StoreWithStats extends Store {
  stats: {
    totalCast: number
    totalCustomers: number
    monthlyRevenue: number
    averageRating: number
  }
}