/**
 * @design_doc   Test for ReservationDialog component edit functionality
 * @related_to   ReservationDialog component, reservation editing features
 * @known_issues None currently
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act, render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ReservationDialog } from './reservation-dialog'
import { STATUS_OPTIONS } from './reservation-dialog.shared'
import { ReservationData } from '@/lib/types/reservation'

// Mock the modification history data
vi.mock('@/lib/modification-history/data', () => ({
  getModificationHistory: vi.fn(() => []),
  buildModificationAlerts: vi.fn(() => []),
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

describe('ReservationDialog operational status order', () => {
  it('puts provisional and correction work before confirmed work and completed work', () => {
    expect(STATUS_OPTIONS.map((option) => option.value)).toEqual([
      'pending',
      'modifiable',
      'confirmed',
      'preconfirmed',
      'completed',
      'cancelled',
    ])
  })
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

vi.mock('@/hooks/use-pricing', () => {
  const pricing = {
    coursePrices: [
      {
        id: 'course-1',
        name: 'スタンダードコース',
        duration: 120,
        price: 13000,
        isActive: true,
        enableWebBooking: true,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      },
    ],
    optionPrices: [
      {
        id: 'option-neck',
        name: 'ネックトリートメント',
        price: 1500,
        duration: 10,
        category: 'relaxation',
        displayOrder: 1,
        isActive: true,
        visibility: 'public',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      },
      {
        id: 'option-stone',
        name: 'ホットストーン',
        price: 1500,
        duration: 10,
        category: 'body-care',
        displayOrder: 2,
        isActive: true,
        visibility: 'public',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      },
    ],
    additionalFees: [],
    courses: [],
    options: [],
    loading: false,
    error: null,
    refresh: vi.fn(),
  }

  return { usePricing: () => pricing }
})

vi.mock('@/hooks/use-locations', () => {
  const locations = {
    areas: [{ id: 'area-1', name: '渋谷エリア' }],
    stations: [{ id: 'station-1', name: '渋谷駅', areaId: 'area-1' }],
    loading: false,
    error: null,
    refresh: vi.fn(),
  }

  return { useLocations: () => locations }
})

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
    status: 'confirmed',
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

  it('keeps the customer phone action in the sticky header and removes the lower contact card', () => {
    render(
      <ReservationDialog
        open
        onOpenChange={vi.fn()}
        reservation={mockReservation}
        onSave={vi.fn()}
      />
    )

    expect(screen.getByRole('link', { name: '090-1234-5678に電話' })).toHaveAttribute(
      'href',
      'tel:090-1234-5678'
    )

    fireEvent.click(screen.getByRole('button', { name: /編集/i }))

    expect(screen.queryByText('連絡先')).not.toBeInTheDocument()
  })

  const mockOnOpenChange = vi.fn()
  const mockOnSave = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('connects the dialog description without a Radix accessibility warning', async () => {
    const warningSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

    try {
      render(
        <ReservationDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          reservation={mockReservation}
          onSave={mockOnSave}
        />
      )

      await act(async () => undefined)

      const dialog = screen.getByRole('dialog')
      const descriptionId = dialog.getAttribute('aria-describedby')
      expect(descriptionId).toBeTruthy()
      expect(document.getElementById(descriptionId!)).toHaveTextContent(
        '予約の詳細情報を表示し、必要に応じて編集できます。'
      )
      expect(
        warningSpy.mock.calls.some(([message]) =>
          String(message).includes('Missing `Description` or `aria-describedby={undefined}`')
        )
      ).toBe(false)
    } finally {
      warningSpy.mockRestore()
    }
  })

  it('scopes the customer lookup to the selected store when the dialog opens', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      const payload = url.startsWith('/api/cast') ? [] : { ngCasts: [] }
      return new Response(JSON.stringify(payload), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    })
    vi.stubGlobal('fetch', fetchMock)

    render(
      <ReservationDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        reservation={mockReservation}
        onSave={mockOnSave}
      />
    )

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('/api/customer?id=c1&storeId=ikebukuro', {
        cache: 'no-store',
        credentials: 'include',
        signal: expect.any(AbortSignal),
      })
    })
  })

  it('should toggle edit mode when edit button is clicked', () => {
    render(
      <ReservationDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        reservation={mockReservation}
        onSave={mockOnSave}
      />
    )

    // Initially not in edit mode
    const editButton = screen.getByRole('button', { name: /編集/i })
    expect(editButton).toBeInTheDocument()

    // Click edit button to enter edit mode
    fireEvent.click(editButton)

    // Should show save button
    expect(screen.getByRole('button', { name: '保存' })).toBeInTheDocument()
    // Should show cancel button - using getAllByRole since there might be multiple cancel buttons
    const cancelButtons = screen.getAllByRole('button', { name: /キャンセル/i })
    expect(cancelButtons.length).toBeGreaterThan(0)
  })

  it('shows date, course, and memo on one reservation tab instead of splitting 概要 and 詳細', () => {
    render(
      <ReservationDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        reservation={mockReservation}
        onSave={mockOnSave}
      />
    )

    expect(screen.getByRole('tab', { name: '予約' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: '履歴' })).toBeInTheDocument()
    expect(screen.queryByRole('tab', { name: '概要' })).not.toBeInTheDocument()
    expect(screen.queryByRole('tab', { name: /^詳細$/ })).not.toBeInTheDocument()
    expect(screen.getByText('日時')).toBeInTheDocument()
    expect(screen.getByText('予約詳細')).toBeInTheDocument()
    expect(screen.getAllByLabelText('ホテル名').length).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: '更新' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '女性に通知' })).toBeInTheDocument()
  })

  it('should display editable fields in edit mode', async () => {
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

    // Check for editable date/time inputs in overview tab
    expect(screen.getByLabelText(/^日付$/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/開始時間/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/終了時間/i)).toHaveAttribute('readonly')

    // Check the current cast and visit-location fields
    expect(screen.getByLabelText(/キャスト/i)).toBeInTheDocument()
    expect(screen.getAllByLabelText('ホテル名').length).toBeGreaterThan(0)
    expect(screen.getByLabelText(/訪問先メモ/i)).toBeInTheDocument()

    expect(screen.getByText('予約詳細')).toBeInTheDocument()

    // Check for editable options checkboxes
    expect(screen.getByLabelText(/ネックトリートメント/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/ホットストーン/i)).toBeInTheDocument()

    // Check for editable memo textarea
    const memoTextarea = screen.getByPlaceholderText(/予約に関する詳細メモを入力/i)
    expect(memoTextarea).not.toBeDisabled()
  })

  it('should show status change buttons in view mode', async () => {
    render(
      <ReservationDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        reservation={mockReservation}
        onSave={mockOnSave}
      />
    )

    const statusTrigger = screen.getByRole('button', { name: /ステータス変更/i })
    fireEvent.pointerDown(statusTrigger, { button: 0 })
    fireEvent.keyDown(statusTrigger, { key: 'Enter' })

    // Check for status change menu items
    await waitFor(() => {
      expect(screen.getByRole('menuitem', { name: /^仮予約/ })).toBeInTheDocument()
    })
    expect(screen.getByRole('menuitem', { name: /^確定/ })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: /^キャンセル/ })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: /^完了/ })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: /^事前確認/ })).toBeInTheDocument()
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

    const confirmCancellation = screen.getByRole('button', { name: /確定してキャンセル/ })
    expect(confirmCancellation).toBeDisabled()
    fireEvent.change(screen.getByLabelText('キャンセル理由詳細'), {
      target: { value: 'お客様の予定変更のため' },
    })
    fireEvent.click(screen.getByRole('button', { name: /確定してキャンセル/ }))

    // onSave should be called with updated status
    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith(mockReservation.id, {
        status: 'cancelled',
        cancellationSource: 'customer',
        cancellationReason: 'お客様の予定変更のため',
      })
    })
  })

  it('edits and displays the card receipt management reference without exposing a card number field', async () => {
    const cardReservation: ReservationData = {
      ...mockReservation,
      serviceId: 'course-1',
      designation: 'なし',
      designationFee: '0円',
      options: {},
      paymentMethod: 'クレジットカード',
      paymentReference: 'IK-2026-00421',
    }

    render(
      <ReservationDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        reservation={cardReservation}
        onSave={mockOnSave}
      />
    )

    expect(screen.getByText('IK-2026-00421')).toBeInTheDocument()
    expect(screen.queryByLabelText('カード番号')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /編集/i }))
    const referenceInput = screen.getByLabelText('カード決済管理番号')
    fireEvent.change(referenceInput, { target: { value: 'IK-2026-00422' } })
    fireEvent.click(screen.getByRole('button', { name: '保存' }))

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith(
        cardReservation.id,
        expect.objectContaining({ paymentReference: 'IK-2026-00422' })
      )
    })
  })

  it('does not label any amount as welfare expense in the editable price breakdown', async () => {
    const pricedReservation: ReservationData = {
      ...mockReservation,
      serviceId: 'course-1',
    }

    render(
      <ReservationDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        reservation={pricedReservation}
        onSave={mockOnSave}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /編集/i }))

    expect(await screen.findByText('料金プレビュー')).toBeInTheDocument()
    expect(screen.queryByText(/厚生費/)).not.toBeInTheDocument()
    expect(screen.queryByText('交通費')).not.toBeInTheDocument()
    expect(screen.queryByText(/配車/)).not.toBeInTheDocument()
  })

  it('should offer the modifiable status for confirmed reservations', async () => {
    render(
      <ReservationDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        reservation={mockReservation}
        onSave={mockOnSave}
      />
    )

    const statusTrigger = screen.getByRole('button', { name: /ステータス変更/i })
    fireEvent.pointerDown(statusTrigger, { button: 0 })
    fireEvent.keyDown(statusTrigger, { key: 'Enter' })

    expect(await screen.findByRole('menuitem', { name: /修正待ち/i })).toBeInTheDocument()
  })

  it('changes only the status when the modifiable option is selected', async () => {
    render(
      <ReservationDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        reservation={mockReservation}
        onSave={mockOnSave}
      />
    )

    const statusTrigger = screen.getByRole('button', { name: /ステータス変更/i })
    fireEvent.pointerDown(statusTrigger, { button: 0 })
    fireEvent.keyDown(statusTrigger, { key: 'Enter' })
    fireEvent.click(await screen.findByRole('menuitem', { name: /修正待ち/i }))

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith(mockReservation.id, {
        status: 'modifiable',
      })
    })
  })

  it('disables status changes while reservation edits are unsaved', async () => {
    render(
      <ReservationDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        reservation={mockReservation}
        onSave={mockOnSave}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /編集/i }))

    expect(screen.getByRole('button', { name: /ステータス変更/i })).toBeDisabled()
  })

  it('disables editing and status changes without a persistence callback', () => {
    render(
      <ReservationDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        reservation={mockReservation}
      />
    )

    expect(screen.getByRole('button', { name: /編集/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /ステータス変更/i })).toBeDisabled()
  })

  it('should show time limit warning when reservation is modifiable', () => {
    const modifiableReservation = {
      ...mockReservation,
      bookingStatus: 'modifiable',
      status: 'modifiable',
      modifiableUntil: new Date(Date.now() + 25 * 60 * 1000), // 25 minutes from now
    }

    render(
      <ReservationDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        reservation={modifiableReservation}
      />
    )

    expect(screen.getByText('修正待ち')).toBeInTheDocument()
    expect(screen.getByText(/修正可能残り時間:/i)).toBeInTheDocument()
  })

  it('should remove the time limit warning when the deadline expires', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2030-01-20T14:00:00'))
    const modifiableReservation = {
      ...mockReservation,
      bookingStatus: 'modifiable',
      status: 'modifiable',
      modifiableUntil: new Date(Date.now() + 1000), // 1 second from now
    }

    render(
      <ReservationDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        reservation={modifiableReservation}
      />
    )

    expect(screen.getByText(/修正可能残り時間:/i)).toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(1000)
    })

    expect(screen.queryByText(/修正可能残り時間:/i)).not.toBeInTheDocument()
  })

  it('should validate form inputs before saving', async () => {
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

    // Clear a required editable field. End time is derived from the selected course duration.
    const dateInput = screen.getByLabelText(/^日付$/i)
    fireEvent.change(dateInput, { target: { value: '' } })

    // Try to save
    fireEvent.click(screen.getByRole('button', { name: '保存' }))

    // Should show validation error
    await waitFor(() => {
      expect(screen.getByText(/予約日と開始時間を入力してください/i)).toBeInTheDocument()
    })

    // onSave should not be called
    expect(mockOnSave).not.toHaveBeenCalled()
  })

  it('shows redeemed points in the total without sending client-derived revenue fields', async () => {
    const pointsReservation: ReservationData = {
      ...mockReservation,
      serviceId: 'course-1',
      designation: 'なし',
      designationFee: '0',
      options: {},
      price: 12_000,
      totalPayment: 12_000,
      pointsUsed: 1_000,
    }

    render(
      <ReservationDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        reservation={pointsReservation}
        onSave={mockOnSave}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /編集/i }))
    expect(screen.getByLabelText('総額')).toHaveValue(12_000)
    fireEvent.click(screen.getByRole('button', { name: '保存' }))

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalled()
    })
    const savedPayload = mockOnSave.mock.calls[0]?.[1]
    expect(savedPayload).not.toHaveProperty('price')
    expect(savedPayload).not.toHaveProperty('storeRevenue')
    expect(savedPayload).not.toHaveProperty('staffRevenue')
    expect(savedPayload).not.toHaveProperty('welfareExpense')
  })

  it('sends an explicit null designation when no designation is selected', async () => {
    const undesignatedReservation: ReservationData = {
      ...mockReservation,
      serviceId: 'course-1',
      designation: 'なし',
      designationFee: '0円',
      options: {},
      price: 13_000,
      totalPayment: 13_000,
    }

    render(
      <ReservationDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        reservation={undesignatedReservation}
        onSave={mockOnSave}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /編集/i }))
    fireEvent.click(screen.getByRole('button', { name: '保存' }))

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith(
        undesignatedReservation.id,
        expect.objectContaining({ designationType: null })
      )
    })
  })

  it('preserves an existing dynamic designation when it is not changed', async () => {
    const legacyDesignationReservation: ReservationData = {
      ...mockReservation,
      serviceId: 'course-1',
      designation: 'panel',
      designationType: 'panel',
      designationFee: '0円',
      options: {},
      price: 13_000,
      totalPayment: 13_000,
    }

    render(
      <ReservationDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        reservation={legacyDesignationReservation}
        onSave={mockOnSave}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /編集/i }))
    fireEvent.click(screen.getByRole('button', { name: '保存' }))

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith(
        legacyDesignationReservation.id,
        expect.objectContaining({ designationType: 'panel' })
      )
    })
  })

  it.each([
    {
      label: 'legacy regular type',
      designationType: 'regular',
      designation: '本指名',
      designationFee: '0円',
    },
    {
      label: 'legacy none type',
      designationType: 'none',
      designation: 'フリー',
      designationFee: '0円',
    },
    {
      label: 'historical designation fee',
      designationType: '本指名',
      designation: '本指名',
      designationFee: '1,000円',
    },
  ])(
    'does not rewrite an unchanged $label from the current designation master',
    async ({ designationType, designation, designationFee }) => {
      const existingDesignationReservation: ReservationData = {
        ...mockReservation,
        serviceId: 'course-1',
        designationType,
        designation,
        designationFee,
        options: {},
      }

      render(
        <ReservationDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          reservation={existingDesignationReservation}
          onSave={mockOnSave}
        />
      )

      fireEvent.click(screen.getByRole('button', { name: /編集/i }))
      fireEvent.click(screen.getByRole('button', { name: '保存' }))

      await waitFor(() => expect(mockOnSave).toHaveBeenCalled())
      const savedPayload = mockOnSave.mock.calls[0]?.[1]
      expect(savedPayload).toEqual(
        expect.objectContaining({
          designationType,
          designationFee: Number(designationFee.replace(/[^0-9.-]/g, '')),
        })
      )
    }
  )

  it('preserves a legacy course and its original end time when unrelated fields are saved', async () => {
    const legacyCourseReservation: ReservationData = {
      ...mockReservation,
      serviceId: 'legacy-course-10',
      course: '旧イベント90分',
      options: {},
      paymentMethod: 'cash',
      startTime: new Date('2024-01-20T14:10:00'),
      endTime: new Date('2024-01-20T15:40:00'),
    }

    render(
      <ReservationDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        reservation={legacyCourseReservation}
        onSave={mockOnSave}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /編集/i }))
    fireEvent.click(screen.getByRole('button', { name: '保存' }))

    await waitFor(() => expect(mockOnSave).toHaveBeenCalled())
    const savedPayload = mockOnSave.mock.calls[0]?.[1]
    expect(savedPayload).not.toHaveProperty('courseId')
    expect(savedPayload).not.toHaveProperty('paymentMethod')
    expect(savedPayload.endTime).toEqual(legacyCourseReservation.endTime)
  })

  it('uses a 5-minute input step and rejects an off-boundary edited start time', async () => {
    const futureReservation: ReservationData = {
      ...mockReservation,
      startTime: new Date('2099-01-20T14:00:00'),
      endTime: new Date('2099-01-20T16:00:00'),
    }

    render(
      <ReservationDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        reservation={futureReservation}
        onSave={mockOnSave}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /編集/i }))
    const startTimeInput = screen.getByLabelText('開始時間')
    expect(startTimeInput).toHaveAttribute('step', '300')

    fireEvent.change(startTimeInput, { target: { value: '14:03' } })
    fireEvent.click(screen.getByRole('button', { name: '保存' }))

    await waitFor(() =>
      expect(screen.getByText('開始時間の分は5分単位で指定してください。')).toBeInTheDocument()
    )
    expect(mockOnSave).not.toHaveBeenCalled()
  })

  it('preserves an existing station and transportation fee when it is absent from current options', async () => {
    const legacyStationReservation: ReservationData = {
      ...mockReservation,
      serviceId: 'course-1',
      options: {},
      areaId: 'legacy-area',
      stationId: 'legacy-station',
      stationName: '旧登録駅',
      transportationFee: 2_000,
    }

    render(
      <ReservationDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        reservation={legacyStationReservation}
        onSave={mockOnSave}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /編集/i }))
    fireEvent.click(screen.getByRole('button', { name: '保存' }))

    await waitFor(() => expect(mockOnSave).toHaveBeenCalled())
    expect(mockOnSave).toHaveBeenCalledWith(
      legacyStationReservation.id,
      expect.objectContaining({ stationId: 'legacy-station', transportationFee: 2_000 })
    )
  })

  it('clamps a negative additional fee before saving', async () => {
    render(
      <ReservationDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        reservation={{ ...mockReservation, serviceId: 'course-1', options: {} }}
        onSave={mockOnSave}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /編集/i }))
    const additionalFeeInput = screen.getByLabelText('追加料金')
    fireEvent.change(additionalFeeInput, { target: { value: '-5000' } })

    expect(additionalFeeInput).toHaveValue(0)
    fireEvent.click(screen.getByRole('button', { name: '保存' }))
    await waitFor(() => expect(mockOnSave).toHaveBeenCalled())
    expect(mockOnSave.mock.calls[0]?.[1]).toEqual(expect.objectContaining({ additionalFee: 0 }))
  })

  it('does not send an overdue entry reminder until the operator clicks the button', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({ data: [] }),
    })
    vi.stubGlobal('fetch', fetchMock)
    const overdueReservation: ReservationData = {
      ...mockReservation,
      entryNotifiedAt: new Date(Date.now() - 11 * 60 * 1000),
      entryConfirmedAt: null,
      entryReminderSentAt: null,
    }

    render(
      <ReservationDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        reservation={overdueReservation}
        onSave={mockOnSave}
      />
    )

    await waitFor(() => expect(fetchMock).toHaveBeenCalled())
    await act(async () => {
      await Promise.resolve()
    })
    expect(
      fetchMock.mock.calls.some(([, init]) => (init as RequestInit | undefined)?.method === 'POST')
    ).toBe(false)
  })

  it('resets a manually edited LINE message when a different reservation is opened', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({ data: [] }),
    })
    vi.stubGlobal('fetch', fetchMock)
    const { rerender } = render(
      <ReservationDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        reservation={mockReservation}
        onSave={mockOnSave}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /編集/i }))
    const lineMessageInput = await screen.findByLabelText('メッセージ本文')
    await waitFor(() =>
      expect((lineMessageInput as HTMLTextAreaElement).value).toContain('田中太郎')
    )
    fireEvent.change(lineMessageInput, { target: { value: '前の予約だけの個人情報' } })

    rerender(
      <ReservationDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        reservation={{ ...mockReservation, id: '2', customerName: '佐藤次郎' }}
        onSave={mockOnSave}
      />
    )

    await waitFor(() =>
      expect((lineMessageInput as HTMLTextAreaElement).value).toContain('佐藤次郎')
    )
    expect((lineMessageInput as HTMLTextAreaElement).value).not.toContain('前の予約だけの個人情報')
  })

  it('should exit edit mode when cancel is clicked', () => {
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

    // Click cancel
    fireEvent.click(screen.getByRole('button', { name: /キャンセル/i }))

    // Should be back to view mode
    expect(screen.getByRole('button', { name: /編集/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '保存' })).not.toBeInTheDocument()
  })
})
