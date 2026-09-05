/**
 * @design_doc   docs/HOTEL_DATA_MODEL.md
 * @related_to   page.tsx; /api/settings/hotel
 * @known_issues Editing nested hotel rates and service areas is outside this screen's current scope
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const toast = vi.hoisted(() => vi.fn())

vi.mock('@/hooks/use-toast', () => ({ toast }))
vi.mock('@/contexts/store-context', () => ({
  useStore: () => ({ currentStore: { id: 'store-a' } }),
}))
vi.mock('@/components/header', () => ({ Header: () => <div>Header</div> }))
vi.mock('@/components/admin/page-header', () => ({
  PageHeader: ({ title }: { title: string }) => <h1>{title}</h1>,
}))
vi.mock('@/components/shared/confirm-dialog', () => ({
  ConfirmDialog: ({
    children,
    description,
  }: {
    children: React.ReactNode
    description: string
  }) => (
    <div>
      {description}
      {children}
    </div>
  ),
}))

import HotelInfoPage from './page'

describe('HotelInfoPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('unwraps the standard API envelope and renders nullable legacy hotel fields safely', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: [
          {
            id: 'hotel-a',
            hotelName: '旧池袋ホテル',
            area: null,
            roomCount: null,
            hourlyRate: null,
            address: null,
            phone: null,
            checkInTime: null,
            checkOutTime: null,
            amenities: [],
            notes: null,
          },
        ],
      }),
    } as Response)

    render(<HotelInfoPage />)

    expect(await screen.findByText('旧池袋ホテル')).toBeInTheDocument()
    expect(fetch).toHaveBeenCalledWith('/api/settings/hotel?storeId=store-a', {
      credentials: 'include',
    })
    expect(screen.getByText(/予約履歴は保持されます/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '旧池袋ホテルを非表示' })).toBeInTheDocument()
    expect(toast).not.toHaveBeenCalled()
  })

  it('renders every active hotel without exposing the obsolete legacy display group', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: [
          {
            id: 'legacy-hotel-67',
            hotelName: 'グランドホテル',
            area: null,
            roomCount: null,
            hourlyRate: null,
            address: null,
            phone: null,
            checkInTime: null,
            checkOutTime: null,
            amenities: [],
            notes: null,
          },
          {
            id: 'legacy-hotel-68',
            hotelName: '池袋グランドホテル',
            area: 'グランドホテル',
            roomCount: null,
            hourlyRate: null,
            address: null,
            phone: null,
            checkInTime: null,
            checkOutTime: null,
            amenities: [],
            notes: null,
          },
        ],
      }),
    } as Response)

    render(<HotelInfoPage />)

    expect(await screen.findByRole('heading', { name: 'グランドホテル' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '池袋グランドホテル' })).toBeInTheDocument()
    expect(screen.queryByText('旧表示グループ: グランドホテル')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('エリア（旧データ表示用）')).not.toBeInTheDocument()
  })

  it('accepts a name-only hotel and unwraps the created response envelope', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [] }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            id: 'hotel-b',
            hotelName: '新規ホテル',
            area: null,
            roomCount: null,
            hourlyRate: null,
            address: null,
            phone: null,
            checkInTime: null,
            checkOutTime: null,
            amenities: [],
            notes: null,
          },
        }),
      } as Response)

    render(<HotelInfoPage />)
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1))

    fireEvent.click(screen.getByRole('button', { name: 'ホテル追加' }))
    fireEvent.change(screen.getByLabelText('ホテル名 *'), {
      target: { value: '新規ホテル' },
    })
    expect(screen.getByRole('button', { name: 'アメニティを追加' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'ホテルを追加' }))

    expect(await screen.findByText('新規ホテル')).toBeInTheDocument()
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('edits an existing hotel through the store-scoped PUT endpoint', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [
            {
              id: 'hotel-a',
              hotelName: '旧ホテル名',
              area: '池袋北口',
              station: '池袋（北口）',
              roomCount: null,
              hourlyRate: null,
              address: null,
              phone: null,
              checkInTime: null,
              checkOutTime: null,
              amenities: [],
              notes: null,
            },
          ],
        }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            id: 'hotel-a',
            hotelName: '池袋グランドホテル',
            area: '池袋北口',
            station: '池袋（北口）',
            roomCount: null,
            hourlyRate: null,
            address: null,
            phone: null,
            checkInTime: null,
            checkOutTime: null,
            amenities: [],
            notes: null,
          },
        }),
      } as Response)

    render(<HotelInfoPage />)

    fireEvent.click(await screen.findByRole('button', { name: '旧ホテル名を編集' }))
    fireEvent.change(screen.getByLabelText('ホテル名 *'), {
      target: { value: '池袋グランドホテル' },
    })
    expect(screen.getByLabelText('最寄り駅・出口')).toHaveValue('池袋（北口）')
    expect(screen.getByLabelText('地域')).toHaveValue('池袋北口')
    fireEvent.change(screen.getByLabelText('地域'), { target: { value: '豊島区' } })
    fireEvent.click(screen.getByRole('button', { name: 'ホテルを更新' }))

    await waitFor(() =>
      expect(fetch).toHaveBeenLastCalledWith('/api/settings/hotel?storeId=store-a', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: expect.stringContaining('池袋グランドホテル'),
      })
    )
    expect(await screen.findByText('池袋グランドホテル')).toBeInTheDocument()
    const sent = JSON.parse(vi.mocked(fetch).mock.calls.at(-1)![1]!.body as string)
    expect(sent).toMatchObject({ area: '豊島区', station: '池袋（北口）' })
  })
})
