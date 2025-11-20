/**
 * @design_doc   Test for ReservationDialog component edit functionality
 * @related_to   ReservationDialog component, reservation editing features
 * @known_issues None currently
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ReservationDialog } from './reservation-dialog'
import { ReservationData } from '@/lib/types/reservation'

// Mock the modification history data
vi.mock('@/lib/modification-history/data', () => ({
  getModificationHistory: vi.fn(() => []),
  getModificationAlerts: vi.fn(() => []),
  recordModification: vi.fn(),
}))

vi.mock('@/contexts/store-context', () => {
  const mockStore = {
    id: 'ikebukuro',
    slug: 'ikebukuro',
    name: '池袋店',
    displayName: 'サロン池袋店',
    address: '東京都豊島区西池袋',
    phone: '03-1234-5678',
    email: 'ikebukuro@example.com',
    openingHours: {
      weekday: { open: '10:00', close: '22:00' },
      weekend: { open: '10:00', close: '22:00' },
    },
    location: { lat: 0, lng: 0 },
    features: [],
    images: { main: '', gallery: [] },
    isActive: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    theme: undefined,
    seoTitle: '',
    seoDescription: '',
    welfareExpenseRate: 10,
    marketingChannels: ['WEB'],
  }

  return {
    useStore: () => ({
      currentStore: mockStore,
      availableStores: [mockStore],
      isSuperAdmin: true,
      isLoading: false,
      switchStore: () => {},
    }),
  }
})

vi.mock('next-auth/react', () => ({
  useSession: () => ({
    data: {
      user: {
        id: 'admin',
        permissions: ['analytics:read'],
      },
    },
    status: 'authenticated',
  }),
}))

describe('ReservationDialog Edit Mode', () => {
  const mockReservation: ReservationData = {
    id: '1',
    customerId: 'c1',
    customerName: '田中太郎',
    customerType: '通常顧客',
    phoneNumber: '090-1234-5678',
    email: 'tanaka@example.com',
    points: 100,
    bookingStatus: 'confirmed',
    staffConfirmation: '確認済み',
    customerConfirmation: '確認済み',
    prefecture: '東京都',
    district: '渋谷区',
    location: 'アパホテル',
    locationType: 'ホテル',
    specificLocation: '501号室',
    staff: '山田花子',
    staffId: 'cast-1',
    marketingChannel: 'Web',
    date: '2024-01-20',
    time: '14:00',
    inOutTime: '14:00-16:00',
    course: 'スタンダードコース',
    freeExtension: 'なし',
    designation: '指名',
    designationFee: '3000',
    options: { ネックトリートメント: true, ホットストーン: true },
    transportationFee: 0,
    paymentMethod: '現金',
    discount: 'なし',
    additionalFee: 0,
    totalPayment: 16000,
    storeRevenue: 10000,
    staffRevenue: 6000,
    staffBonusFee: 1000,
    startTime: new Date('2024-01-20T14:00:00'),
    endTime: new Date('2024-01-20T16:00:00'),
    staffImage: '/staff/yamada.jpg',
  }

  const mockOnOpenChange = vi.fn()
  const mockOnSave = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should toggle edit mode when edit button is clicked', () => {
    render(
      <ReservationDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        reservation={mockReservation}
      />
    )

    // Initially not in edit mode
    const editButton = screen.getByRole('button', { name: /編集/i })
    expect(editButton).toBeInTheDocument()

    // Click edit button to enter edit mode
    fireEvent.click(editButton)

    // Should show save button
    expect(screen.getByRole('button', { name: /保存/i })).toBeInTheDocument()
    // Should show cancel button - using getAllByRole since there might be multiple cancel buttons
    const cancelButtons = screen.getAllByRole('button', { name: /キャンセル/i })
    expect(cancelButtons.length).toBeGreaterThan(0)
  })

  it.skip('should display editable fields in edit mode', () => {
    render(
      <ReservationDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        reservation={mockReservation}
      />
    )

    // Enter edit mode
    fireEvent.click(screen.getByRole('button', { name: /編集/i }))

    // Check for editable date/time inputs in overview tab
    expect(screen.getByLabelText(/予約日/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/開始時間/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/終了時間/i)).toBeInTheDocument()

    // Check for editable select fields
    expect(screen.getByLabelText(/キャスト/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^場所$/i)).toBeInTheDocument()

    // Switch to details tab to check other fields
    fireEvent.click(screen.getByRole('tab', { name: /詳細/i }))

    // Check for editable options checkboxes
    expect(screen.getByLabelText(/ネックトリートメント/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/ホットストーン/i)).toBeInTheDocument()

    // Check for editable memo textarea
    const memoTextarea = screen.getByPlaceholderText(/メモを入力/i)
    expect(memoTextarea).not.toBeDisabled()
  })

  it('should show status change buttons in edit mode', async () => {
    render(
      <ReservationDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        reservation={mockReservation}
      />
    )

    // Enter edit mode
    fireEvent.click(screen.getByRole('button', { name: /編集/i }))

    const statusTrigger = screen.getByRole('button', { name: /ステータス変更/i })
    fireEvent.pointerDown(statusTrigger, { button: 0 })
    fireEvent.keyDown(statusTrigger, { key: 'Enter' })

    // Check for status change menu items
    await waitFor(() => {
      expect(screen.getByRole('menuitem', { name: /仮予約/ })).toBeInTheDocument()
    })
    expect(screen.getByRole('menuitem', { name: /確定/ })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: /キャンセル/ })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: /対応済み/ })).toBeInTheDocument()
  })

  it('should show confirmation dialog when changing status', async () => {
    render(
      <ReservationDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        reservation={mockReservation}
        onSave={mockOnSave}
      />
    )

    // Enter edit mode
    fireEvent.click(screen.getByRole('button', { name: /編集/i }))

    const statusTrigger = screen.getByRole('button', { name: /ステータス変更/i })
    fireEvent.pointerDown(statusTrigger, { button: 0 })
    fireEvent.keyDown(statusTrigger, { key: 'Enter' })
    await waitFor(() => {
      expect(screen.getByRole('menuitem', { name: /キャンセル/ })).toBeInTheDocument()
    })

    // Click status change menu item
    const cancelItem = screen.getByRole('menuitem', { name: /キャンセル/ })
    fireEvent.click(cancelItem)

    await waitFor(() => {
      expect(screen.getByText(/キャンセル理由を選択/)).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /確定してキャンセル/ }))

    // onSave should be called with updated status
    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith(
        mockReservation.id,
        expect.objectContaining({ status: 'cancelled', cancellationSource: 'customer' })
      )
    })
  })

  it.skip('should show modifiable button for confirmed reservations', async () => {
    render(
      <ReservationDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        reservation={mockReservation}
      />
    )

    // Switch to details tab
    const detailsTab = screen.getByRole('tab', { name: /詳細/i })
    fireEvent.click(detailsTab)

    // Wait for tab content to change and button to appear
    await waitFor(
      () => {
        const modifyButton = screen.getByRole('button', { name: /予約修正/i })
        expect(modifyButton).toBeInTheDocument()
      },
      { timeout: 3000 }
    )
  })

  it.skip('should change status to modifiable when modify button is clicked', async () => {
    render(
      <ReservationDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        reservation={mockReservation}
        onSave={mockOnSave}
      />
    )

    // Switch to details tab
    fireEvent.click(screen.getByRole('tab', { name: /詳細/i }))

    // Wait for tab content to render and click modify button
    await waitFor(
      () => {
        const modifyButton = screen.getByRole('button', { name: /予約修正/i })
        fireEvent.click(modifyButton)
      },
      { timeout: 3000 }
    )

    // Check for confirmation dialog
    await waitFor(() => {
      expect(screen.getByText(/予約を修正可能状態にしますか？/i)).toBeInTheDocument()
    })

    // Confirm the change
    fireEvent.click(screen.getByRole('button', { name: /修正可能にする/i }))

    // Should call onSave with modifiable status
    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith(
        expect.objectContaining({
          bookingStatus: 'modifiable',
          modifiableUntil: expect.any(Date),
        })
      )
    })
  })

  it.skip('should show time limit warning when reservation is modifiable', () => {
    const modifiableReservation = {
      ...mockReservation,
      bookingStatus: 'modifiable',
      modifiableUntil: new Date(Date.now() + 25 * 60 * 1000), // 25 minutes from now
    }

    render(
      <ReservationDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        reservation={modifiableReservation}
      />
    )

    // Check for modifiable status warning
    expect(screen.getByText(/修正可能状態/i)).toBeInTheDocument()
    expect(screen.getByText(/修正可能/i)).toBeInTheDocument()
    expect(screen.getByText(/残り時間/i)).toBeInTheDocument()
  })

  it.skip('should automatically revert to confirmed status when time expires', async () => {
    const modifiableReservation = {
      ...mockReservation,
      bookingStatus: 'modifiable',
      modifiableUntil: new Date(Date.now() + 1000), // 1 second from now
    }

    render(
      <ReservationDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        reservation={modifiableReservation}
        onSave={mockOnSave}
      />
    )

    // Initially should show modifiable status
    expect(screen.getByText(/修正可能状態/i)).toBeInTheDocument()

    // Wait for timer to expire
    await waitFor(
      () => {
        expect(mockOnSave).toHaveBeenCalledWith(
          expect.objectContaining({
            bookingStatus: 'confirmed',
          })
        )
      },
      { timeout: 2000 }
    )
  })

  it.skip('should validate form inputs before saving', async () => {
    render(
      <ReservationDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        reservation={mockReservation}
        onSave={mockOnSave}
      />
    )

    // Enter edit mode
    fireEvent.click(screen.getByRole('button', { name: /編集/i }))

    // Clear required field (e.g., end time)
    const endTimeInput = screen.getByLabelText(/終了時間/i)
    fireEvent.change(endTimeInput, { target: { value: '' } })

    // Try to save
    fireEvent.click(screen.getByRole('button', { name: /保存/i }))

    // Should show validation error
    await waitFor(() => {
      expect(screen.getByText(/終了時間は必須です/i)).toBeInTheDocument()
    })

    // onSave should not be called
    expect(mockOnSave).not.toHaveBeenCalled()
  })

  it.skip('should exit edit mode when cancel is clicked', () => {
    render(
      <ReservationDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        reservation={mockReservation}
      />
    )

    // Enter edit mode
    fireEvent.click(screen.getByRole('button', { name: /編集/i }))

    // Click cancel
    fireEvent.click(screen.getByRole('button', { name: /キャンセル/i }))

    // Should be back to view mode
    expect(screen.getByRole('button', { name: /編集/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /保存/i })).not.toBeInTheDocument()
  })
})
