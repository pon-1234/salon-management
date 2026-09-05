/**
 * @design_doc https://app.notion.com/p/3ccdda8d8bde80ec928cc17adff35cde
 * @related_to PricingPage retains the administrator's course display order
 * @known_issues Synthetic pricing fixtures only
 */
import { render, screen } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import PricingPage from './page'
vi.mock('@/lib/store/public-api', () => ({ fetchStoreBySlug: async () => ({ id: 'store-a' }) }))
vi.mock('@/lib/store/public-pricing', () => ({
  getPublicStorePricing: async () => ({
    courses: [
      { id: 'long', name: 'Long course', duration: 120, price: 20000 },
      { id: 'short', name: 'Short course', duration: 60, price: 10000 },
    ],
    options: [],
    additionalFees: [],
    notes: [],
  }),
}))
vi.mock('@/components/store-navigation', () => ({ StoreNavigation: () => null }))
vi.mock('@/components/store-footer', () => ({ StoreFooter: () => null }))
it('displays the saved order instead of sorting by duration again', async () => {
  render(await PricingPage({ params: Promise.resolve({ store: 'ikebukuro' }) }))
  const long = screen.getByText('Long course')
  const short = screen.getByText('Short course')
  expect(long.compareDocumentPosition(short) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
})
