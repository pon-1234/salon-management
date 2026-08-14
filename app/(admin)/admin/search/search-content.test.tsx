/**
 * @design_doc   Administrator customer search compatibility
 * @related_to   SearchContent; GET /api/customer paginated general search
 * @known_issues None
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { SearchContent } from './search-content'

const navigationState = vi.hoisted(() => ({ query: '0901' }))

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams({ query: navigationState.query }),
}))

vi.mock('@/contexts/store-context', () => ({
  useStore: () => ({ currentStore: { id: 'ikebukuro' } }),
}))

function searchResponse(name: string, hasMore = false): Response {
  return {
    ok: true,
    json: async () => ({
      items: [{ id: `customer-${name}`, name, phone: '+819012345678' }],
      hasMore,
    }),
  } as Response
}

function deferredResponse() {
  let resolve!: (response: Response) => void
  const promise = new Promise<Response>((resolver) => {
    resolve = resolver
  })
  return { promise, resolve }
}

describe('SearchContent', () => {
  beforeEach(() => {
    navigationState.query = '0901'
    global.fetch = vi.fn()
  })

  it('uses general paginated search so a partial phone finds canonical customers', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        items: [{ id: 'customer-1', name: '検索 顧客', phone: '+819012345678' }],
        hasMore: false,
      }),
    } as Response)

    render(<SearchContent />)

    expect(await screen.findByText('検索 顧客')).toBeInTheDocument()
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        '/api/customer?query=0901&limit=25&offset=0&storeId=ikebukuro',
        {
          credentials: 'include',
          cache: 'no-store',
          signal: expect.any(AbortSignal),
        }
      )
    })
  })

  it('shows an explicit retry action when the customer API fails', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce({ ok: false, status: 503 } as Response)
      .mockResolvedValueOnce(searchResponse('再試行成功顧客'))

    render(<SearchContent />)

    expect(await screen.findByRole('alert')).toHaveTextContent('顧客検索に失敗しました')
    expect(screen.queryByText('該当する顧客が見つかりませんでした。')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '再試行' }))

    expect(await screen.findByText('再試行成功顧客')).toBeInTheDocument()
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('returns to the first page when the search query changes', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(searchResponse('1ページ目顧客', true))
      .mockResolvedValueOnce(searchResponse('2ページ目顧客'))
      .mockResolvedValueOnce(searchResponse('新しい検索顧客'))

    const { rerender } = render(<SearchContent />)

    await screen.findByText('1ページ目顧客')
    fireEvent.click(screen.getByRole('button', { name: '次へ' }))
    expect(await screen.findByText('2ページ目顧客')).toBeInTheDocument()
    expect(screen.getByText('2ページ')).toBeInTheDocument()

    navigationState.query = '池袋'
    rerender(<SearchContent />)

    expect(await screen.findByText('新しい検索顧客')).toBeInTheDocument()
    expect(screen.getByText('1ページ')).toBeInTheDocument()
    expect(fetch).toHaveBeenLastCalledWith(
      '/api/customer?query=%E6%B1%A0%E8%A2%8B&limit=25&offset=0&storeId=ikebukuro',
      {
        credentials: 'include',
        cache: 'no-store',
        signal: expect.any(AbortSignal),
      }
    )
  })

  it('does not let an older request overwrite a newer query result', async () => {
    const older = deferredResponse()
    const newer = deferredResponse()
    vi.mocked(fetch).mockReturnValueOnce(older.promise).mockReturnValueOnce(newer.promise)

    const { rerender } = render(<SearchContent />)
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1))

    navigationState.query = '新しい検索'
    rerender(<SearchContent />)
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2))

    newer.resolve(searchResponse('新しい結果'))
    expect(await screen.findByText('新しい結果')).toBeInTheDocument()

    older.resolve(searchResponse('古い結果'))
    await waitFor(() => expect(screen.queryByText('古い結果')).not.toBeInTheDocument())
    expect(screen.getByText('新しい結果')).toBeInTheDocument()
  })
})
