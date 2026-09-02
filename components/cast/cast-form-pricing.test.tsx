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
  it('requests pricing for the selected administrator store', () => {
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      }
    )

    render(<CastForm storeId="uat-ikebukuro" cast={null} onSubmit={vi.fn()} isSubmitting={false} />)

    expect(usePricingMock).toHaveBeenCalledWith('uat-ikebukuro')
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

  it('selects panel and repeat take-home bonuses from the same store master', async () => {
    render(<CastForm storeId="uat-ikebukuro" cast={null} onSubmit={vi.fn()} isSubmitting={false} />)

    fireEvent.click(await screen.findByLabelText('パネル指名手取UP'))
    expect(await screen.findByRole('option', { name: 'パネルUP A（1,000円）' })).toBeInTheDocument()
    fireEvent.click(screen.getByLabelText('本指名手取UP'))
    expect(await screen.findByRole('option', { name: '本指名UP B（2,000円）' })).toBeInTheDocument()
  })
})
