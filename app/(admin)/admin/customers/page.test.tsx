/**
 * @design_doc   docs/LEGACY_GOLD_ADMIN_MIGRATION_INVENTORY.md customer management
 * @related_to   CustomerListPage; GET /api/customer query filter
 * @known_issues None
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import CustomerListPage from './page'

describe('CustomerListPage', () => {
  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ items: [], hasMore: false }),
    })
  })

  it('searches the full customer ledger instead of filtering only the current page', async () => {
    render(<CustomerListPage />)

    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith('/api/customer?limit=25&offset=0', {
        credentials: 'include',
        cache: 'no-store',
      })
    )

    fireEvent.change(screen.getByPlaceholderText('氏名・電話番号・メール・会員番号で検索'), {
      target: { value: '旧実名顧客' },
    })
    fireEvent.click(screen.getByRole('button', { name: '検索' }))

    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith(
        '/api/customer?limit=25&offset=0&query=%E6%97%A7%E5%AE%9F%E5%90%8D%E9%A1%A7%E5%AE%A2',
        {
          credentials: 'include',
          cache: 'no-store',
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
            phone: '09012345678',
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
})
