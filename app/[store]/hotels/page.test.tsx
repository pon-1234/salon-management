/**
 * @design_doc https://app.notion.com/p/3ccdda8d8bde80ec928cc17adff35cde
 * @related_to HotelsPage - publishes active hotels from the requested store
 * @known_issues Internal notes and import source fields are never published
 */
import { render, screen } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { db } from '@/lib/db'
import { fetchStoreBySlug } from '@/lib/store/public-api'
import HotelsPage from './page'
vi.mock('@/lib/db', () => ({ db: { hotelSettings: { findMany: vi.fn() } } }))
vi.mock('@/lib/store/public-api', () => ({ fetchStoreBySlug: vi.fn() }))
vi.mock('@/components/store-navigation', () => ({ StoreNavigation: () => null }))
vi.mock('@/components/store-footer', () => ({ StoreFooter: () => null }))
it('reads only active hotels for the requested store and displays public details', async () => {
  vi.mocked(fetchStoreBySlug).mockResolvedValue({ id: 'store-a', slug: 'ikebukuro' } as any)
  vi.mocked(db.hotelSettings.findMany).mockResolvedValue([
    {
      id: 'a',
      hotelName: 'ホテルA',
      area: '豊島区',
      station: '北口',
      address: '東京都豊島区',
      phone: null,
    },
  ] as any)
  render(await HotelsPage({ params: Promise.resolve({ store: 'ikebukuro' }) }))
  expect(await screen.findByRole('heading', { name: 'ホテルA' })).toBeInTheDocument()
  expect(screen.getByText('豊島区 ＞ 北口')).toBeInTheDocument()
  expect(screen.getByText('東京都豊島区')).toBeInTheDocument()
  expect(db.hotelSettings.findMany).toHaveBeenCalledWith({
    where: { storeId: 'store-a', isActive: true },
    orderBy: [{ displayOrder: 'asc' }, { hotelName: 'asc' }],
    select: { id: true, hotelName: true, area: true, station: true, address: true, phone: true },
  })
})
