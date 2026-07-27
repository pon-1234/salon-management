/**
 * @design_doc   docs/SYSTEM_AUDIT_2026-07-26.md J-14 storefront SSR
 * @related_to   StoreHomeClient and StoreHomeContent
 * @known_issues None
 */
import { describe, expect, it, vi } from 'vitest'
import { renderToString } from 'react-dom/server'
import { StoreHomeClient } from './store-home-client'

vi.mock('@/components/store-home-content', () => ({
  StoreHomeContent: ({ store }: { store: { displayName?: string; name: string } }) => (
    <main>{store.displayName ?? store.name}</main>
  ),
}))

describe('StoreHomeClient server rendering', () => {
  it('renders the storefront body in the initial HTML without waiting for localStorage', () => {
    const html = renderToString(
      <StoreHomeClient
        store={{ name: 'サロン池袋店', displayName: 'サロン池袋店' } as never}
        initialData={null}
      />
    )

    expect(html).toContain('サロン池袋店')
  })
})
