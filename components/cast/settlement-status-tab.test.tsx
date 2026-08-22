/**
 * @design_doc   docs/LEGACY_GOLD_ADMIN_MIGRATION_INVENTORY.md cast settlement management
 * @related_to   SettlementStatusTab and CastSettlementsData
 * @known_issues None
 */
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { CastSettlementsData } from '@/lib/cast-portal/types'
import { SettlementStatusTab } from './settlement-status-tab'

vi.mock('next-auth/react', () => ({
  useSession: () => ({
    data: { user: { id: 'admin-1', name: '池袋受付', email: 'uke@example.com', role: 'admin' } },
    status: 'authenticated',
  }),
}))

const records: CastSettlementsData['days'][number]['records'] = [
  {
    id: 'pending-reservation',
    startTime: '2026-08-14T01:00:00.000Z',
    status: 'completed',
    settlementStatus: 'pending',
    courseName: '未精算コース',
    courseDuration: 60,
    price: 20_000,
    staffRevenue: 10_000,
    storeRevenue: 10_000,
    welfareExpense: 1_000,
    designationFee: 0,
    transportationFee: 0,
    additionalFee: 0,
    discountAmount: 0,
    options: [],
  },
  {
    id: 'partial-reservation',
    startTime: '2026-08-14T02:00:00.000Z',
    status: 'completed',
    settlementStatus: 'partial',
    courseName: '一部精算コース',
    courseDuration: 90,
    price: 35_000,
    staffRevenue: 20_000,
    storeRevenue: 15_000,
    welfareExpense: 1_000,
    designationFee: 0,
    transportationFee: 0,
    additionalFee: 0,
    discountAmount: 0,
    options: [],
  },
  {
    id: 'settled-reservation',
    startTime: '2026-08-14T03:00:00.000Z',
    status: 'completed',
    settlementStatus: 'settled',
    courseName: '精算済みコース',
    courseDuration: 120,
    price: 45_000,
    staffRevenue: 30_000,
    storeRevenue: 15_000,
    welfareExpense: 1_000,
    designationFee: 0,
    transportationFee: 0,
    additionalFee: 0,
    discountAmount: 0,
    options: [],
  },
]

const settlementPayload: CastSettlementsData = {
  summary: {
    month: '2026-08',
    totalRevenue: 100_000,
    staffRevenue: 60_000,
    storeRevenue: 40_000,
    welfareExpense: 3_000,
    completedCount: 3,
    pendingCount: 1,
  },
  days: [
    {
      date: '2026-08-14',
      totalRevenue: 100_000,
      reservationCount: 3,
      records,
    },
  ],
}

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('SettlementStatusTab', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.stubGlobal('fetch', vi.fn())
  })

  it('uses staffRevenue as the final cast take-home without subtracting welfare twice', async () => {
    const user = userEvent.setup()
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(settlementPayload))

    render(<SettlementStatusTab castId="cast-1" castName="池袋キャスト" storeId="ikebukuro" />)

    const takeHomeTile = await screen.findByRole('group', { name: '今月の手取り見込み' })
    expect(within(takeHomeTile).getByText('¥60,000')).toBeVisible()
    expect(within(takeHomeTile).queryByText('¥57,000')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /8月14日/ }))
    const pendingRow = screen.getByText('未精算コース').closest('.flex.flex-wrap')
    expect(pendingRow).not.toBeNull()
    expect(within(pendingRow as HTMLElement).getByText('¥10,000')).toBeVisible()
    expect(within(pendingRow as HTMLElement).queryByText('¥9,000')).not.toBeInTheDocument()
  })

  it('shows pending, partial, and settled as separate amounts and counts', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(settlementPayload))

    render(<SettlementStatusTab castId="cast-1" castName="池袋キャスト" storeId="ikebukuro" />)

    const pendingTile = await screen.findByRole('group', { name: '未精算' })
    const partialTile = screen.getByRole('group', { name: '一部精算' })
    const settledTile = screen.getByRole('group', { name: '精算済み' })

    expect(within(pendingTile).getByText('¥10,000')).toBeVisible()
    expect(within(pendingTile).getByText('件数 1 件')).toBeVisible()
    expect(within(partialTile).getByText('¥20,000')).toBeVisible()
    expect(within(partialTile).getByText('件数 1 件')).toBeVisible()
    expect(within(settledTile).getByText('¥30,000')).toBeVisible()
    expect(within(settledTile).getByText('件数 1 件')).toBeVisible()
  })

  it('renders the API error body as an alert', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse({ error: '精算APIが一時的に利用できません' }, 503)
    )

    render(<SettlementStatusTab castId="cast-1" castName="池袋キャスト" storeId="ikebukuro" />)

    expect(await screen.findByRole('alert')).toHaveTextContent('精算APIが一時的に利用できません')
  })

  it('opens the settlement dialog from the status header with unpaid reservations selected', async () => {
    const user = userEvent.setup()
    vi.mocked(fetch).mockResolvedValue(jsonResponse(settlementPayload))

    render(<SettlementStatusTab castId="cast-1" castName="池袋キャスト" storeId="ikebukuro" />)

    await user.click(await screen.findByRole('button', { name: '精算する' }))
    const dialog = await screen.findByRole('dialog')
    const amount = within(dialog).getByRole('spinbutton', { name: '今回精算する額' })

    expect(amount).toHaveValue(30_000)
    expect(within(dialog).getByText('未精算コース')).toBeVisible()
    expect(within(dialog).getByText('一部精算コース')).toBeVisible()
    expect(within(dialog).queryByText('精算済みコース')).not.toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: '未精算全件を入れる' })).toBeVisible()
    expect(within(dialog).getByText(/一括/)).toBeVisible()
    expect(within(dialog).queryByRole('textbox', { name: '処理者' })).not.toBeInTheDocument()
    expect(within(dialog).getByText('池袋受付')).toBeVisible()
  })

  it('restores every unpaid reservation when 未精算全件を入れる is clicked', async () => {
    const user = userEvent.setup()
    vi.mocked(fetch).mockResolvedValue(jsonResponse(settlementPayload))

    render(<SettlementStatusTab castId="cast-1" castName="池袋キャスト" storeId="ikebukuro" />)

    await user.click(await screen.findByRole('button', { name: '精算する' }))
    const dialog = await screen.findByRole('dialog')
    const unpaidCheckbox = within(dialog).getByRole('checkbox', { name: /未精算コース/ })
    await user.click(unpaidCheckbox)
    expect(within(dialog).getByRole('spinbutton', { name: '今回精算する額' })).toHaveValue(20_000)

    await user.click(within(dialog).getByRole('button', { name: '未精算全件を入れる' }))
    expect(unpaidCheckbox).toBeChecked()
    expect(within(dialog).getByRole('spinbutton', { name: '今回精算する額' })).toHaveValue(30_000)
  })

  it('posts a settlement and refreshes status after confirm', async () => {
    const user = userEvent.setup()
    const onSettled = vi.fn()
    vi.mocked(fetch).mockImplementation(async (_input, init) => {
      if (init?.method === 'POST') {
        return jsonResponse({ id: 'payment-1' }, 201)
      }
      return jsonResponse(settlementPayload)
    })

    render(
      <SettlementStatusTab
        castId="cast-1"
        castName="池袋キャスト"
        storeId="ikebukuro"
        onSettled={onSettled}
      />
    )

    await user.click(await screen.findByRole('button', { name: '精算する' }))
    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: '精算を確定' }))

    await waitFor(() => {
      expect(onSettled).toHaveBeenCalledTimes(1)
    })
    const postCall = vi.mocked(fetch).mock.calls.find(([, init]) => init?.method === 'POST')
    expect(JSON.parse(String(postCall?.[1]?.body))).toEqual(
      expect.objectContaining({
        amount: 30_000,
        handledBy: '池袋受付',
        reservationIds: ['pending-reservation', 'partial-reservation'],
      })
    )
  })
})
