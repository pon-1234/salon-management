/**
 * @design_doc   Customer MyPage reservation history backed by the authenticated reservation API
 * @related_to   reservation-history.tsx; app/api/reservation/route.ts
 * @known_issues Review submission and rebooking actions are outside this read-only history view
 */
import { act, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Store } from '@/lib/store/types'
import { ReservationHistory } from './reservation-history'

const store: Store = {
  id: 'store-1',
  slug: 'ikebukuro',
  name: 'Ikebukuro',
  displayName: '池袋店',
  address: '東京都豊島区',
  phone: '03-0000-0000',
  email: 'store@example.com',
  openingHours: {
    weekday: { open: '10:00', close: '22:00' },
    weekend: { open: '10:00', close: '22:00' },
  },
  location: { lat: 35.7, lng: 139.7 },
  features: [],
  images: { main: '', gallery: [] },
  isActive: true,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
}

function response(body: unknown, init: { ok?: boolean; status?: number } = {}): Response {
  const ok = init.ok ?? true
  return {
    ok,
    status: init.status ?? (ok ? 200 : 500),
    json: vi.fn().mockResolvedValue(body),
  } as unknown as Response
}

function reservation(overrides: Record<string, unknown>) {
  return {
    id: 'reservation-1',
    customerId: 'customer-1',
    storeId: store.id,
    castId: 'cast-1',
    courseId: 'course-1',
    startTime: '2026-08-01T03:00:00.000Z',
    endTime: '2026-08-01T05:00:00.000Z',
    status: 'confirmed',
    price: 30_000,
    cast: { id: 'cast-1', name: 'キャストA' },
    course: { id: 'course-1', name: '120分コース', duration: 120, price: 30_000 },
    options: [],
    area: { id: 'area-1', name: '池袋エリア' },
    station: null,
    ...overrides,
  }
}

describe('ReservationHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows a loading state while the authenticated reservation request is pending', async () => {
    let resolveRequest: ((value: Response) => void) | undefined
    vi.mocked(global.fetch).mockReturnValueOnce(
      new Promise<Response>((resolve) => {
        resolveRequest = resolve
      })
    )

    render(<ReservationHistory store={store} />)

    expect(screen.getByRole('status')).toHaveTextContent('予約履歴を読み込んでいます')

    await act(async () => {
      resolveRequest?.(response([]))
    })
    await screen.findByText('まだ予約履歴がありません')
  })

  it('shows an error state when the reservation API fails', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(
      response({ error: 'Internal server error' }, { ok: false, status: 500 })
    )

    render(<ReservationHistory store={store} />)

    expect(await screen.findByRole('alert')).toHaveTextContent('予約履歴の取得に失敗しました')
    expect(screen.queryByText('すずか')).not.toBeInTheDocument()
  })

  it('shows the empty state and requests only the selected store', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(response([]))

    render(<ReservationHistory store={store} />)

    expect(await screen.findByText('まだ予約履歴がありません')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'キャストを見る' })).toHaveAttribute(
      'href',
      '/ikebukuro/cast'
    )
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/reservation?storeId=store-1&sortBy=startTime&sortOrder=desc',
      { credentials: 'include', cache: 'no-store' }
    )
  })

  it('renders sanitized database reservations newest first without the 2024 mock entries', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(
      response([
        reservation({
          id: 'older-upcoming',
          startTime: '2026-08-01T03:00:00.000Z',
          endTime: '2026-08-01T05:00:00.000Z',
          cast: { id: 'cast-old', name: '先の予約キャスト' },
          course: { id: 'course-old', name: '90分コース', duration: 90, price: 20_000 },
          price: 20_000,
        }),
        reservation({
          id: 'completed',
          startTime: '2026-07-01T03:00:00.000Z',
          endTime: '2026-07-01T05:00:00.000Z',
          status: 'completed',
          cast: { id: 'cast-past', name: '利用済みキャスト' },
          options: [
            {
              id: 'reservation-option-1',
              optionId: 'option-1',
              optionName: '公開オプション',
              optionPrice: 2_000,
            },
          ],
        }),
        reservation({
          id: 'newer-upcoming',
          startTime: '2026-09-01T03:00:00.000Z',
          endTime: '2026-09-01T05:00:00.000Z',
          cast: { id: 'cast-new', name: '次の予約キャスト' },
          course: {
            id: 'course-new',
            name: '150分プレミアムコース',
            duration: 150,
            price: 40_000,
          },
          price: 40_000,
        }),
      ])
    )

    render(<ReservationHistory store={store} />)

    await screen.findByText('次の予約キャスト')
    const cards = screen.getAllByRole('article')
    expect(cards).toHaveLength(3)
    expect(cards[0]).toHaveTextContent('次の予約キャスト')
    expect(cards[1]).toHaveTextContent('先の予約キャスト')
    expect(cards[2]).toHaveTextContent('利用済みキャスト')
    expect(cards[0]).toHaveTextContent('150分プレミアムコース')
    expect(cards[0]).toHaveTextContent('¥40,000')
    expect(cards[2]).toHaveTextContent('公開オプション')
    expect(screen.queryByText('すずか')).not.toBeInTheDocument()
    expect(screen.queryByText('みるく')).not.toBeInTheDocument()

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1))
  })
})
