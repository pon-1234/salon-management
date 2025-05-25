import { Store } from './types'

export const stores: Store[] = [
  {
    id: 'store-001',
    code: 'ikebukuro',
    name: '金の玉クラブ池袋店',
    displayName: '池袋～密着零丸マッサージ～',
    address: '東京都豊島区池袋1-1-1',
    phone: '03-1234-5678',
    email: 'ikebukuro@salon-system.com',
    theme: {
      primaryColor: '#10b981', // emerald-600
      secondaryColor: '#f3f4f6'
    },
    settings: {
      timezone: 'Asia/Tokyo',
      currency: 'JPY',
      workingHours: {
        start: '10:00',
        end: '24:00'
      }
    },
    isActive: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  },
  {
    id: 'store-002',
    code: 'shinjuku',
    name: '金の玉クラブ新宿店',
    displayName: '新宿～癒しの手技～',
    address: '東京都新宿区新宿1-1-1',
    phone: '03-2345-6789',
    email: 'shinjuku@salon-system.com',
    theme: {
      primaryColor: '#3b82f6', // blue-600
      secondaryColor: '#f3f4f6'
    },
    settings: {
      timezone: 'Asia/Tokyo',
      currency: 'JPY',
      workingHours: {
        start: '11:00',
        end: '25:00'
      }
    },
    isActive: true,
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15')
  },
  {
    id: 'store-003',
    code: 'shibuya',
    name: '金の玉クラブ渋谷店',
    displayName: '渋谷～極上の癒し空間～',
    address: '東京都渋谷区渋谷1-1-1',
    phone: '03-3456-7890',
    email: 'shibuya@salon-system.com',
    theme: {
      primaryColor: '#8b5cf6', // violet-600
      secondaryColor: '#f3f4f6'
    },
    settings: {
      timezone: 'Asia/Tokyo',
      currency: 'JPY',
      workingHours: {
        start: '12:00',
        end: '26:00'
      }
    },
    isActive: true,
    createdAt: new Date('2024-02-01'),
    updatedAt: new Date('2024-02-01')
  }
]

export function getStoreByCode(code: string): Store | null {
  return stores.find(store => store.code === code) || null
}

export function getStoreBySubdomain(subdomain: string): Store | null {
  return getStoreByCode(subdomain)
}

export function getAllStores(): Store[] {
  return stores.filter(store => store.isActive)
}