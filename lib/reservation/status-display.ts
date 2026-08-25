/**
 * @design_doc   docs/IKEBUKURO_FIELD_UAT_MANUAL.md reservation status labels
 * @related_to   ReservationDialog, ReservationList, dashboard recent holds
 * @known_issues Shop vs WEB distinction uses marketingChannel until a dedicated source field exists
 */
const WEB_CHANNEL_PATTERN = /web|heaven|ネット|sns|line|ショートメール|サイト/i

export function isWebBookingChannel(channel?: string | null): boolean {
  const value = channel?.trim() ?? ''
  return value.length > 0 && WEB_CHANNEL_PATTERN.test(value)
}

export function getReservationStatusLabel(
  status: string,
  marketingChannel?: string | null
): string {
  if (status === 'pending' || status === 'tentative') {
    return isWebBookingChannel(marketingChannel) ? '仮予約（WEB）' : '仮予約（店舗）'
  }
  if (status === 'preconfirmed') return '事前確認'
  if (status === 'confirmed') return '確定'
  if (status === 'modifiable') return '修正待ち'
  if (status === 'cancelled') return 'キャンセル'
  if (status === 'completed') return '完了'
  return status
}

export function reservationOpsListRank(status: string): number {
  if (status === 'pending' || status === 'tentative' || status === 'modifiable') return 0
  if (status === 'confirmed' || status === 'preconfirmed') return 1
  if (status === 'completed') return 2
  return 3
}

export function compareReservationsForOpsList<
  T extends { status?: string | null; startTime: Date | string },
>(left: T, right: T): number {
  const rank =
    reservationOpsListRank(left.status ?? '') - reservationOpsListRank(right.status ?? '')
  if (rank !== 0) return rank
  const leftStart = left.startTime instanceof Date ? left.startTime : new Date(left.startTime)
  const rightStart = right.startTime instanceof Date ? right.startTime : new Date(right.startTime)
  return leftStart.getTime() - rightStart.getTime()
}

export function isCompletedOpsStatus(status?: string | null): boolean {
  return status === 'completed'
}
