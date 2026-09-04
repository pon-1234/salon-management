/**
 * @design_doc   Notion task #281 reservation option visibility rules
 * @related_to   Option API, ReservationDialog, QuickBookingDialog, and PublicProfileForm
 * @known_issues None
 */

const HIDDEN_RESERVATION_OPTION_NAMES = new Set(['旧システム無料系オプション #1'])

export function isVisibleReservationOption(option: { name?: string | null }): boolean {
  const name = option.name?.trim()
  return !name || !HIDDEN_RESERVATION_OPTION_NAMES.has(name)
}
