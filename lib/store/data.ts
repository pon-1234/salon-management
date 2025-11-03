import { Store } from './types'

export const storesData: Store[] = [
  {
    id: 'ikebukuro',
    slug: 'ikebukuro',
    name: '池袋店',
    displayName: 'サロン池袋店',
    address: '〒171-0021 東京都豊島区西池袋1-15-9 池袋ビル 5F',
    phone: '03-1234-5678',
    email: 'ikebukuro@example.com',
    openingHours: {
      weekday: { open: '10:00', close: '22:00' },
      weekend: { open: '9:00', close: '21:00' },
    },
    location: {
      lat: 35.7295,
      lng: 139.7109,
    },
    features: ['プレミアムキャスト在籍', 'VIPルーム完備', '深夜営業'],
    images: {
      main: '/images/stores/ikebukuro/main.jpg',
      gallery: [
        '/images/stores/ikebukuro/gallery-1.jpg',
        '/images/stores/ikebukuro/gallery-2.jpg',
        '/images/stores/ikebukuro/gallery-3.jpg',
      ],
    },
    theme: {
      primaryColor: '#7C3AED',
      secondaryColor: '#EC4899',
    },
    seoTitle: 'サロン池袋店 - 高級サロン',
    seoDescription: '池袋駅西口徒歩5分。プレミアムキャスト在籍の高級サロン。',
    welfareExpenseRate: 10,
    isActive: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: 'shinjuku',
    slug: 'shinjuku',
    name: '新宿店',
    displayName: 'サロン新宿店',
    address: '〒160-0023 東京都新宿区西新宿1-13-12 新宿ビル 8F',
    phone: '03-2345-6789',
    email: 'shinjuku@example.com',
    openingHours: {
      weekday: { open: '11:00', close: '23:00' },
      weekend: { open: '10:00', close: '22:00' },
    },
    location: {
      lat: 35.6938,
      lng: 139.7034,
    },
    features: ['新人キャスト多数', '個室完備', '24時間予約可能'],
    images: {
      main: '/images/stores/shinjuku/main.jpg',
      gallery: [
        '/images/stores/shinjuku/gallery-1.jpg',
        '/images/stores/shinjuku/gallery-2.jpg',
        '/images/stores/shinjuku/gallery-3.jpg',
      ],
    },
    theme: {
      primaryColor: '#3B82F6',
      secondaryColor: '#8B5CF6',
    },
    seoTitle: 'サロン新宿店 - 新宿西口の高級サロン',
    seoDescription: '新宿駅西口徒歩3分。個室完備の高級サロン。',
    welfareExpenseRate: 10,
    isActive: true,
    createdAt: new Date('2024-02-01'),
    updatedAt: new Date('2024-02-01'),
  },
  {
    id: 'shibuya',
    slug: 'shibuya',
    name: '渋谷店',
    displayName: 'サロン渋谷店',
    address: '〒150-0041 東京都渋谷区神南1-12-16 渋谷ビル 6F',
    phone: '03-3456-7890',
    email: 'shibuya@example.com',
    openingHours: {
      weekday: { open: '12:00', close: '24:00' },
      weekend: { open: '11:00', close: '23:00' },
    },
    location: {
      lat: 35.664,
      lng: 139.6982,
    },
    features: ['若手キャスト中心', 'モダンな内装', 'イベント開催'],
    images: {
      main: '/images/stores/shibuya/main.jpg',
      gallery: [
        '/images/stores/shibuya/gallery-1.jpg',
        '/images/stores/shibuya/gallery-2.jpg',
        '/images/stores/shibuya/gallery-3.jpg',
      ],
    },
    theme: {
      primaryColor: '#F59E0B',
      secondaryColor: '#EF4444',
    },
    seoTitle: 'サロン渋谷店 - 渋谷の高級サロン',
    seoDescription: '渋谷駅徒歩7分。若手キャスト中心のモダンなサロン。',
    welfareExpenseRate: 10,
    isActive: true,
    createdAt: new Date('2024-03-01'),
    updatedAt: new Date('2024-03-01'),
  },
]

export function getStoreBySlug(slug: string): Store | undefined {
  return storesData.find((store) => store.slug === slug)
}

export function getActiveStores(): Store[] {
  return storesData.filter((store) => store.isActive)
}
