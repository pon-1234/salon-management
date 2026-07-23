/**
 * @design_doc   Reservation history client adapter with explicit store scoping
 * @related_to   app/api/reservation/history/route.ts, ReservationDialog
 * @known_issues Modification alerts are not implemented
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

export async function getModificationAlerts(_reservationId: string): Promise<ModificationAlert[]> {
  return []
}

export async function recordModification(
  _reservationId?: string,
  _actorId?: string,
  _actorName?: string,
  _fieldName?: string,
  _fieldDisplayName?: string,
  _oldValue?: string,
  _newValue?: string,
  _reason?: string,
  _actorIp?: string,
  _actorAgent?: string,
  _sessionId?: string
): Promise<void> {
  // サーバー側で自動的に履歴を記録するため、クライアントからの手動記録は不要
}
