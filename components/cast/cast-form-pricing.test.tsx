/**
 * @design_doc   Cast editing must load pricing from the administrator's selected store
 * @related_to   CastForm, usePricing, and CastManagePage
 * @known_issues None
 */
import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

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

import { CastForm } from './cast-form'

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
})
