/**
 * @design_doc   docs/LEGACY_GOLD_ADMIN_MIGRATION_INVENTORY.md customer management
 * @related_to   CustomerListPage; GET /api/customer query filter
 * @known_issues None
 */
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import CustomerListPage from './page'

const authState = vi.hoisted(() => ({
  permissions: ['customer:read', 'customer:create'],
  currentStore: { id: 'ikebukuro', slug: 'ikebukuro' },
}))

vi.mock('next-auth/react', () => ({
  useSession: () => ({
    data: { user: { role: 'admin', permissions: authState.permissions } },
    status: 'authenticated',
  }),
}))

vi.mock('@/contexts/store-context', () => ({
  useStore: () => ({ currentStore: authState.currentStore }),
}))

const customerResponse = (id: string, name: string) =>
  ({
    ok: true,
    json: async () => ({
      items: [
        {
          id,
          name,
          phone: '+819012345678',
          email: `${id}@example.com`,
          memberType: 'regular',
          accountStatus: 'active',
          membershipStage: 'regular',
          createdAt: '2026-08-15T00:00:00.000Z',
        },
      ],
      hasMore: false,
    }),
  }) as Response

describe('CustomerListPage', () => {
  beforeEach(() => {
    authState.permissions = ['customer:read', 'customer:create']
    authState.currentStore = { id: 'ikebukuro', slug: 'ikebukuro' }
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ items: [], hasMore: false }),
    })
  })

  it('searches the full customer ledger instead of filtering only the current page', async () => {
    render(<CustomerListPage />)

    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith('/api/customer?limit=25&offset=0&storeId=ikebukuro', {
        credentials: 'include',
        cache: 'no-store',
        signal: expect.any(AbortSignal),
      })
    )

    fireEvent.change(screen.getByPlaceholderText('氏名・電話番号・メール・会員番号で検索'), {
      target: { value: '旧実名顧客' },
    })
    fireEvent.click(screen.getByRole('button', { name: '検索' }))

    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith(
        '/api/customer?limit=25&offset=0&query=%E6%97%A7%E5%AE%9F%E5%90%8D%E9%A1%A7%E5%AE%A2&storeId=ikebukuro',
        {
          credentials: 'include',
          cache: 'no-store',
          signal: expect.any(AbortSignal),
        }
      )
    )
  })

  it('shows the migrated legacy account status and membership stage', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        items: [
          {
            id: 'legacy-customer-member-5',
            name: '[確認用] 旧顧客',
            phone: '+819012345678',
            email: 'legacy@example.com',
            memberType: 'regular',
            accountStatus: 'blocked',
            membershipStage: 'platinum',
            createdAt: '2020-01-01T00:00:00.000Z',
          },
        ],
        hasMore: false,
      }),
    } as Response)

    render(<CustomerListPage />)

    expect(await screen.findByText('ブラック')).toBeInTheDocument()
    expect(screen.getByText('プラチナ')).toBeInTheDocument()
    expect(screen.getByText('090-1234-5678')).toBeInTheDocument()
  })

  it('shows a retryable inline error instead of presenting a failed load as an empty ledger', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce({
        ok: false,
        status: 503,
        json: async () => ({ error: 'unavailable' }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ items: [], hasMore: false }),
      } as Response)

    render(<CustomerListPage />)

    expect(await screen.findByRole('alert')).toHaveTextContent('顧客一覧を取得できませんでした')
    expect(screen.queryByText('顧客が登録されていません。')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '再試行' }))

    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2))
    expect(await screen.findByText('顧客が登録されていません。')).toBeInTheDocument()
  })

  it('distinguishes a search miss from an empty ledger', async () => {
    render(<CustomerListPage />)

    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1))

    fireEvent.change(screen.getByPlaceholderText('氏名・電話番号・メール・会員番号で検索'), {
      target: { value: '存在しない顧客' },
    })
    fireEvent.click(screen.getByRole('button', { name: '検索' }))

    expect(await screen.findByText('条件に一致する顧客が見つかりません。')).toBeInTheDocument()
    expect(screen.queryByText('顧客が登録されていません。')).not.toBeInTheDocument()
  })

  it('does not expose new customer creation without customer:create permission', async () => {
    authState.permissions = ['customer:read']

    render(<CustomerListPage />)

    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1))
    expect(screen.queryByRole('link', { name: '新規顧客を追加' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '新規顧客を追加' })).not.toBeInTheDocument()
  })

  it('loads the customer ledger with customer:read even without customer:create', async () => {
    authState.permissions = ['customer:read']

    render(<CustomerListPage />)

    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1))
    expect(screen.getByRole('heading', { name: '顧客一覧' })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: '顧客検索' })).toBeInTheDocument()
  })

  it('shows a permission error and never loads customer data with customer:create alone', async () => {
    authState.permissions = ['customer:create']

    render(<CustomerListPage />)

    expect(screen.getByRole('alert')).toHaveTextContent('顧客情報の閲覧権限がありません')
    expect(screen.queryByRole('heading', { name: '顧客一覧' })).not.toBeInTheDocument()
    expect(screen.queryByRole('textbox', { name: '顧客検索' })).not.toBeInTheDocument()
    await waitFor(() => expect(fetch).not.toHaveBeenCalled())
  })

  it('ignores a delayed customer response from the previous store', async () => {
    let resolveIkebukuro: ((response: Response) => void) | undefined
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      if (String(input).includes('storeId=ikebukuro')) {
        return new Promise<Response>((resolve) => {
          resolveIkebukuro = resolve
        })
      }
      return Promise.resolve(customerResponse('shinjuku-customer', '新宿の顧客'))
    })
    vi.stubGlobal('fetch', fetchMock)
    const { rerender } = render(<CustomerListPage />)

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/customer?limit=25&offset=0&storeId=ikebukuro',
        expect.any(Object)
      )
    )

    authState.currentStore = { id: 'shinjuku', slug: 'shinjuku' }
    rerender(<CustomerListPage />)

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/customer?limit=25&offset=0&storeId=shinjuku',
        expect.any(Object)
      )
    )
    expect(await screen.findByText('新宿の顧客')).toBeInTheDocument()

    await act(async () => {
      resolveIkebukuro?.(customerResponse('ikebukuro-customer', '池袋の顧客'))
      await new Promise((resolve) => setTimeout(resolve, 0))
    })

    expect(screen.getByText('新宿の顧客')).toBeInTheDocument()
    expect(screen.queryByText('池袋の顧客')).not.toBeInTheDocument()
  })
})
