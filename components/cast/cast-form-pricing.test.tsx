/**
 * @design_doc   Cast editing must load pricing from the administrator's selected store
 * @related_to   CastForm, usePricing, and CastManagePage
 * @known_issues None
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeAll, describe, expect, it, vi } from 'vitest'

const usePricingMock = vi.hoisted(() =>
  vi.fn(() => ({
    coursePrices: [],
    optionPrices: [],
    additionalFees: [],
    courses: [],
    options: [],
    loading: false,
    error: null,
    refresh: vi.fn(),
  }))
)

vi.mock('@/hooks/use-pricing', () => ({ usePricing: usePricingMock }))

const getDesignationFeesMock = vi.hoisted(() =>
  vi.fn().mockResolvedValue([
    {
      id: 'bronze',
      name: 'ブロンズ',
      price: 1000,
      storeShare: 0,
      castShare: 1000,
      sortOrder: 1,
      isActive: true,
      kind: 'other',
    },
    {
      id: 'panel-up-1000',
      name: 'パネルUP A',
      price: 1000,
      storeShare: 0,
      castShare: 1000,
      sortOrder: 2,
      isActive: true,
      kind: 'panel',
      isTakeHomeBonus: true,
    },
    {
      id: 'repeat-up-2000',
      name: '本指名UP B',
      price: 2000,
      storeShare: 0,
      castShare: 2000,
      sortOrder: 3,
      isActive: true,
      kind: 'repeat',
      isTakeHomeBonus: true,
    },
    {
      id: 'free-up-500',
      name: 'フリーUP',
      price: 500,
      storeShare: 0,
      castShare: 500,
      sortOrder: 4,
      isActive: true,
      kind: 'free',
      isTakeHomeBonus: true,
    },
    {
      id: 'recommend-up-1500',
      name: 'おすすめUP',
      price: 1500,
      storeShare: 0,
      castShare: 1500,
      sortOrder: 5,
      isActive: true,
      kind: 'recommend',
      isTakeHomeBonus: true,
    },
    {
      id: 'customer-panel',
      name: '顧客向けパネル指名',
      price: 2000,
      kind: 'panel',
      isTakeHomeBonus: false,
      isActive: true,
      storeShare: 1000,
      castShare: 1000,
      sortOrder: 9,
    },
  ])
)

vi.mock('@/lib/designation/data', () => ({ getDesignationFees: getDesignationFeesMock }))

import { CastForm } from './cast-form'

beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
    configurable: true,
    value: vi.fn(),
  })
})

describe('CastForm pricing scope', () => {
  it('requests designation pricing for the selected administrator store', async () => {
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      }
    )

    render(<CastForm storeId="uat-ikebukuro" cast={null} onSubmit={vi.fn()} isSubmitting={false} />)

    await waitFor(() =>
      expect(getDesignationFeesMock).toHaveBeenCalledWith({ storeId: 'uat-ikebukuro' })
    )
  })

  it('selects the special designation fee from the store master including zero yen', async () => {
    render(<CastForm storeId="uat-ikebukuro" cast={null} onSubmit={vi.fn()} isSubmitting={false} />)

    await waitFor(() =>
      expect(getDesignationFeesMock).toHaveBeenCalledWith({ storeId: 'uat-ikebukuro' })
    )
    fireEvent.click(screen.getByLabelText('特別指名料ランク'))
    expect(await screen.findByRole('option', { name: 'なし（0円）' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'ブロンズ（1,000円）' })).toBeInTheDocument()
  })

  it('selects free, panel, recommended, and repeat take-home bonuses separately', async () => {
    render(<CastForm storeId="uat-ikebukuro" cast={null} onSubmit={vi.fn()} isSubmitting={false} />)

    fireEvent.click(await screen.findByLabelText('フリー指名手取UP'))
    expect(await screen.findByRole('option', { name: 'フリーUP（500円）' })).toBeInTheDocument()
    fireEvent.click(screen.getByLabelText('パネル指名手取UP'))
    expect(await screen.findByRole('option', { name: 'パネルUP A（1,000円）' })).toBeInTheDocument()
    expect(
      screen.queryByRole('option', { name: '顧客向けパネル指名（2,000円）' })
    ).not.toBeInTheDocument()
    fireEvent.click(screen.getByLabelText('おすすめP指名手取UP'))
    expect(await screen.findByRole('option', { name: 'おすすめUP（1,500円）' })).toBeInTheDocument()
    fireEvent.click(screen.getByLabelText('本指名手取UP'))
    expect(await screen.findByRole('option', { name: '本指名UP B（2,000円）' })).toBeInTheDocument()
  })
})
