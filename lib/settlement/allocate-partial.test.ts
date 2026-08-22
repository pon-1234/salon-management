/**
 * @design_doc   PAY-05 一部精算額を古い予約から順に配賦する
 * @related_to   allocateSettlementAmount
 * @known_issues None
 */
import { describe, expect, it } from 'vitest'

import { allocateSettlementAmount } from './allocate-partial'

describe('allocateSettlementAmount', () => {
  it('allocates a partial amount from the oldest reservation first', () => {
    const result = allocateSettlementAmount(
      [
        {
          id: 'newer',
          staffRevenue: 16_000,
          alreadyAllocated: 0,
          startTime: new Date('2026-08-22T12:00:00+09:00'),
        },
        {
          id: 'older',
          staffRevenue: 15_000,
          alreadyAllocated: 0,
          startTime: new Date('2026-08-20T12:00:00+09:00'),
        },
        {
          id: 'middle',
          staffRevenue: 15_000,
          alreadyAllocated: 0,
          startTime: new Date('2026-08-21T12:00:00+09:00'),
        },
      ],
      40_000
    )

    expect(result).toEqual({
      allocations: [
        { reservationId: 'older', allocatedAmount: 15_000, nextStatus: 'settled' },
        { reservationId: 'middle', allocatedAmount: 15_000, nextStatus: 'settled' },
        { reservationId: 'newer', allocatedAmount: 10_000, nextStatus: 'partial' },
      ],
      remainingAmount: 0,
    })
  })

  it('leaves later reservations pending when the amount is smaller than the oldest share', () => {
    const result = allocateSettlementAmount(
      [
        {
          id: 'first',
          staffRevenue: 20_000,
          alreadyAllocated: 0,
          startTime: new Date('2026-08-20T12:00:00+09:00'),
        },
        {
          id: 'second',
          staffRevenue: 26_000,
          alreadyAllocated: 0,
          startTime: new Date('2026-08-21T12:00:00+09:00'),
        },
      ],
      40_000
    )

    expect(result.allocations).toEqual([
      { reservationId: 'first', allocatedAmount: 20_000, nextStatus: 'settled' },
      { reservationId: 'second', allocatedAmount: 20_000, nextStatus: 'partial' },
    ])
  })
})
