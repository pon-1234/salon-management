import { ModificationHistory, ModificationAlert } from '@/lib/types/modification-history'

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

export async function getModificationHistory(reservationId: string): Promise<ModificationHistory[]> {
  if (!reservationId) {
    return []
  }

  const response = await fetch(`${HISTORY_ENDPOINT}?reservationId=${encodeURIComponent(reservationId)}`, {
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

export async function recordModification(): Promise<void> {
  // サーバー側で自動的に履歴を記録するため、クライアントからの手動記録は不要
}
