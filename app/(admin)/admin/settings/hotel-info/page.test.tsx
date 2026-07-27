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
})
