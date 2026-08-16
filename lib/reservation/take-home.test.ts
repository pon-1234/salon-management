/**
 * @design_doc   Shared take-home display contract for admin and cast settlement screens
 * @related_to   calculateReservationRevenue, settlement status tabs
 * @known_issues None
 */
import { describe, expect, it } from 'vitest'

import { resolveCastTakeHome } from './take-home'

describe('resolveCastTakeHome', () => {
  it('uses staffRevenue as take-home without subtracting welfare again', () => {
    expect(
      resolveCastTakeHome({
        staffRevenue: 18_000,
        welfareExpense: 3_000,
      })
    ).toBe(18_000)
  })

  it('never returns a negative take-home', () => {
    expect(
      resolveCastTakeHome({
        staffRevenue: -500,
        welfareExpense: 3_000,
      })
    ).toBe(0)
  })
})
