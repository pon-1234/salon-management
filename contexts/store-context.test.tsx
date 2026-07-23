/**
 * @design_doc   docs/PREVIEW_UAT_CHECKLIST.md database-backed administrator store selection
 * @related_to   app/api/admin/stores/route.ts supplies the authenticated store catalog
 * @known_issues Browser tests mock the authenticated catalog response rather than opening a server
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useSession } from 'next-auth/react'

import { StoreProvider, useStore } from './store-context'

vi.mock('next-auth/react', () => ({ useSession: vi.fn() }))

const timestamp = '2026-07-20T00:00:00.000Z'
const catalogStores = [
  {
    id: 'uat-ikebukuro',
    slug: 'uat-ikebukuro',
    name: '[UAT] 池袋確認店',
    displayName: '[UAT] 池袋確認店',
    address: '[UAT] 池袋住所',
    phone: '00000000000',
    email: 'uat-ikebukuro@preview-uat.invalid',
    openingHours: {
      weekday: { open: '10:00', close: '00:00' },
      weekend: { open: '10:00', close: '00:00' },
    },
    location: { lat: 0, lng: 0 },
    features: [],
    images: { main: '', gallery: [] },
    welfareExpenseRate: 10,
    marketingChannels: ['[UAT] WEB'],
    isActive: true,
    createdAt: timestamp,
    updatedAt: timestamp,
  },
  {
    id: 'uat-osaka',
    slug: 'uat-osaka',
    name: '[UAT] 大阪確認店',
    displayName: '[UAT] 大阪確認店',
    address: '[UAT] 大阪住所',
    phone: '00000000001',
    email: 'uat-osaka@preview-uat.invalid',
    openingHours: {
      weekday: { open: '10:00', close: '00:00' },
      weekend: { open: '10:00', close: '00:00' },
    },
    location: { lat: 0, lng: 0 },
    features: [],
    images: { main: '', gallery: [] },
    welfareExpenseRate: 10,
    marketingChannels: ['[UAT] WEB'],
    isActive: true,
    createdAt: timestamp,
    updatedAt: timestamp,
  },
]

function CatalogProbe() {
  const { currentStore, availableStores, isSuperAdmin, switchStore } = useStore()
  return (
    <div>
      <div data-testid="current-store">{currentStore.id}</div>
      <div data-testid="available-stores">{availableStores.map(({ id }) => id).join(',')}</div>
      <div data-testid="is-super">{String(isSuperAdmin)}</div>
      <button type="button" onClick={() => switchStore('uat-osaka')}>
        switch
      </button>
    </div>
  )
}

describe('StoreProvider administrator catalog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.localStorage.clear()
  })

  it('uses the authenticated database catalog and hides an unassigned store from a manager', async () => {
    vi.mocked(useSession).mockReturnValue({
      data: {
        user: {
          id: 'manager-1',
          role: 'admin',
          adminRole: 'manager',
          permissions: ['reservation:read'],
          storeIds: ['uat-ikebukuro'],
        },
      },
      status: 'authenticated',
    } as never)
    const fetchMock = vi.fn(
      async () =>
        new Response(JSON.stringify({ stores: catalogStores }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
    )
    vi.stubGlobal('fetch', fetchMock)

    render(
      <StoreProvider>
        <CatalogProbe />
      </StoreProvider>
    )

    await waitFor(() =>
      expect(screen.getByTestId('current-store')).toHaveTextContent('uat-ikebukuro')
    )
    expect(screen.getByTestId('available-stores')).toHaveTextContent('uat-ikebukuro')
    expect(screen.getByTestId('available-stores')).not.toHaveTextContent('uat-osaka')
    fireEvent.click(screen.getByRole('button', { name: 'switch' }))
    expect(screen.getByTestId('current-store')).toHaveTextContent('uat-ikebukuro')
    expect(fetchMock).toHaveBeenCalledWith('/api/admin/stores', {
      cache: 'no-store',
      credentials: 'include',
    })
  })

  it('lets a super administrator select either active database store', async () => {
    vi.mocked(useSession).mockReturnValue({
      data: {
        user: {
          id: 'super-1',
          role: 'admin',
          adminRole: 'super_admin',
          permissions: ['*'],
          storeIds: [],
        },
      },
      status: 'authenticated',
    } as never)
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(JSON.stringify({ stores: catalogStores }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
      )
    )

    render(
      <StoreProvider>
        <CatalogProbe />
      </StoreProvider>
    )

    await waitFor(() =>
      expect(screen.getByTestId('available-stores')).toHaveTextContent('uat-ikebukuro,uat-osaka')
    )
    expect(screen.getByTestId('is-super')).toHaveTextContent('true')
    fireEvent.click(screen.getByRole('button', { name: 'switch' }))
    expect(screen.getByTestId('current-store')).toHaveTextContent('uat-osaka')
  })

  it('fails closed instead of falling back to static stores when the admin catalog fails', async () => {
    vi.mocked(useSession).mockReturnValue({
      data: {
        user: {
          id: 'manager-1',
          role: 'admin',
          adminRole: 'manager',
          permissions: ['reservation:read'],
          storeIds: ['uat-ikebukuro'],
        },
      },
      status: 'authenticated',
    } as never)
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(null, { status: 503 }))
    )

    render(
      <StoreProvider>
        <CatalogProbe />
      </StoreProvider>
    )

    expect(
      await screen.findByText('このアカウントに利用可能な店舗が割り当てられていません。')
    ).toBeInTheDocument()
    expect(screen.queryByText('ikebukuro')).not.toBeInTheDocument()
  })
})
