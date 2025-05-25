export interface Store {
  id: string
  code: string // サブドメイン用コード (ikebukuro, shinjuku, etc.)
  name: string
  displayName: string
  address: string
  phone: string
  email: string
  logo?: string
  theme?: {
    primaryColor: string
    secondaryColor: string
  }
  settings: {
    timezone: string
    currency: string
    workingHours: {
      start: string
      end: string
    }
  }
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface StoreConfig {
  currentStore: Store
  availableStores: Store[]
  isSuperAdmin: boolean // 複数店舗管理権限
}