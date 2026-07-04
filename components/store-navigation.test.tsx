/**
 * @design_doc   ui-improvement-instructions.md U-7 mobile store navigation
 * @related_to   StoreNavigation: public storefront header and mobile sheet menu
 * @known_issues Visual tap-distance is verified manually at 375px
 */
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { StoreProvider } from '@/components/store-provider'
import type { Store } from '@/lib/store/types'
import { StoreNavigation } from './store-navigation'

vi.mock('next-auth/react', () => ({
  useSession: () => ({ data: null, status: 'unauthenticated' }),
  signOut: vi.fn(),
}))

const store: Store = {
  id: 'store-1',
  slug: 'ikebukuro',
  name: 'THE SALON 池袋',
  displayName: '池袋店',
  address: '東京都豊島区',
  phone: '03-1234-5678',
  email: 'info@example.com',
  seoDescription: 'テスト店舗',
  location: { lat: 35.7295, lng: 139.7109 },
  features: ['駅近'],
  images: {
    main: '/stores/ikebukuro/main.jpg',
    gallery: [],
  },
  isActive: true,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  openingHours: {
    weekday: { open: '10:00', close: '05:00' },
    weekend: { open: '10:00', close: '05:00' },
  },
}

describe('StoreNavigation', () => {
  it('shows phone and auth routes in the mobile sheet menu', () => {
    render(
      <StoreProvider store={store}>
        <StoreNavigation />
      </StoreProvider>
    )

    fireEvent.click(screen.getByRole('button', { name: '店舗メニューを開く' }))

    expect(screen.getByRole('link', { name: /電話で問い合わせ/ })).toHaveAttribute(
      'href',
      'tel:03-1234-5678'
    )
    expect(screen.getAllByText('営業時間 10:00～翌05:00')).toHaveLength(2)
    expect(screen.getByRole('link', { name: '会員登録' })).toHaveAttribute(
      'href',
      '/ikebukuro/register'
    )
    expect(screen.getByRole('link', { name: 'ログイン' })).toHaveAttribute(
      'href',
      '/ikebukuro/login'
    )
  })
})
