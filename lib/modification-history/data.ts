/**
 * @design_doc   Reservation history client adapter with explicit store scoping
 * @related_to   app/api/reservation/history/route.ts, ReservationDialog
 * @known_issues Alerts are derived from persisted history and are not independently acknowledged
 */
import { ModificationHistory, ModificationAlert } from '@/lib/types/modification-history'
import { buildStoreScopedEndpoint } from '@/lib/store/endpoints'

const HISTORY_ENDPOINT = '/api/reservation/history'

function normalizeHistoryEntry(entry: any): ModificationHistory {
  return {
    id: entry.id,
    reservationId: entry.reservationId,
    fieldName: entry.fieldName,
    fieldDisplayName: entry.fieldDisplayName,
    oldValue: entry.oldValue ?? null,
    newValue: entry.newValue ?? null,
    reason: entry.reason ?? null,
    actorId: entry.actorId ?? null,
    actorName: entry.actorName ?? null,
    actorIp: entry.actorIp ?? null,
    actorAgent: entry.actorAgent ?? null,
    timestamp: entry.createdAt ? new Date(entry.createdAt) : new Date(),
  }
}

export async function getModificationHistory(
  reservationId: string,
  storeId: string
): Promise<ModificationHistory[]> {
  if (!reservationId) {
    return []
  }

  const endpoint = buildStoreScopedEndpoint(
    `${HISTORY_ENDPOINT}?reservationId=${encodeURIComponent(reservationId)}`,
    storeId
  )
  const response = await fetch(endpoint, {
    cache: 'no-store',
    credentials: 'include',
  })

  if (!response.ok) {
    throw new Error(`Failed to load reservation history (${response.status})`)
  }

  const payload = await response.json()
  if (!Array.isArray(payload)) {
    return []
  }

  return payload.map(normalizeHistoryEntry)
}

export function buildModificationAlerts(
  history: readonly ModificationHistory[]
): ModificationAlert[] {
  return history.slice(0, 10).map((entry) => ({
    id: `alert-${entry.id}`,
    reservationId: entry.reservationId,
    type: entry.fieldName === 'status' ? 'warning' : 'info',
    message: `${entry.fieldDisplayName}が「${entry.oldValue ?? '未設定'}」から「${entry.newValue ?? '未設定'}」に変更されました。`,
    timestamp: entry.timestamp,
    isRead: false,
  }))
}
