/**
 * @design_doc   PAY-05 一部精算額を古い予約から順に配賦する
 * @related_to   upsertSettlementPayment
 * @known_issues None
 */
export type SettlementAllocationInput = {
  id: string
  staffRevenue: number
  alreadyAllocated: number
  startTime: Date | string
}

export type SettlementAllocation = {
  reservationId: string
  allocatedAmount: number
  nextStatus: 'settled' | 'partial' | 'pending'
}

export function remainingStaffRevenue(input: {
  staffRevenue: number
  alreadyAllocated: number
}): number {
  return Math.max(
    0,
    Math.round(input.staffRevenue) - Math.max(0, Math.round(input.alreadyAllocated))
  )
}

export function allocateSettlementAmount(
  reservations: readonly SettlementAllocationInput[],
  amount: number
): { allocations: SettlementAllocation[]; remainingAmount: number } {
  let remaining = Math.max(0, Math.round(amount))
  const allocations: SettlementAllocation[] = []

  const ordered = [...reservations].sort((left, right) => {
    const leftTime = new Date(left.startTime).getTime()
    const rightTime = new Date(right.startTime).getTime()
    return leftTime - rightTime || left.id.localeCompare(right.id)
  })

  for (const reservation of ordered) {
    if (remaining <= 0) {
      break
    }
    const unpaid = remainingStaffRevenue({
      staffRevenue: reservation.staffRevenue,
      alreadyAllocated: reservation.alreadyAllocated,
    })
    if (unpaid <= 0) {
      continue
    }
    const allocatedAmount = Math.min(unpaid, remaining)
    remaining -= allocatedAmount
    allocations.push({
      reservationId: reservation.id,
      allocatedAmount,
      nextStatus: allocatedAmount === unpaid ? 'settled' : 'partial',
    })
  }

  return { allocations, remainingAmount: remaining }
}
