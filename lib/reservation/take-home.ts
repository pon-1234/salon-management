/**
 * @design_doc   Shared take-home display contract for admin and cast settlement screens
 * @related_to   calculateReservationRevenue, settlement status tabs
 * @known_issues Welfare is already applied in the course split; do not subtract it again
 */
export function resolveCastTakeHome(input: {
  staffRevenue: number
  welfareExpense?: number
}): number {
  return Math.max(Math.round(input.staffRevenue || 0), 0)
}
