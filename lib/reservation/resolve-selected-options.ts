/**
 * @design_doc   RSV-03 予約更新時に旧オプションIDや無効化済み選択を残す
 * @related_to   app/api/reservation/route.ts option validation
 * @known_issues None
 */
import { resolveOptionId } from '@/lib/options/data'

export type OptionCatalogRecord = {
  id: string
  isActive: boolean
  archivedAt: Date | string | null
}

export function resolveSelectedOptionIds(input: {
  requestedIds: readonly string[]
  catalog: readonly OptionCatalogRecord[]
  attachedIds?: readonly string[]
}): { acceptedIds: string[]; missingIds: string[] } {
  const requestedIds = Array.from(
    new Set(input.requestedIds.map((id) => id.trim()).filter((id) => id.length > 0))
  )
  if (requestedIds.length === 0) {
    return { acceptedIds: [], missingIds: [] }
  }

  const attached = new Set((input.attachedIds ?? []).filter(Boolean))
  const catalogById = new Map(input.catalog.map((record) => [record.id, record]))
  const acceptedIds: string[] = []
  const missingIds: string[] = []

  for (const optionId of requestedIds) {
    if (attached.has(optionId)) {
      acceptedIds.push(optionId)
      continue
    }

    const record = catalogById.get(optionId)
    const isSelectable = Boolean(record && record.isActive !== false && record.archivedAt == null)
    if (isSelectable) {
      acceptedIds.push(optionId)
      continue
    }

    missingIds.push(optionId)
  }

  return { acceptedIds, missingIds }
}

export function uniqueResolvedOptionIds(ids: readonly string[]): string[] {
  return Array.from(new Set(ids.map((id) => resolveOptionId(id))))
}

export function normalizeRequestedOptionIds(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null
  return Array.from(
    new Set(
      value
        .filter(
          (optionId): optionId is string =>
            typeof optionId === 'string' && optionId.trim().length > 0
        )
        .map((optionId) => optionId.trim())
    )
  )
}

export function hasOptionSelectionChanged(
  requestedIds: readonly string[] | null,
  attached: readonly AttachedReservationOption[]
): boolean {
  if (requestedIds === null) return false
  const requested = [...requestedIds].sort()
  const existing = Array.from(new Set(attachedOptionIds(attached))).sort()
  return (
    requested.length !== existing.length ||
    requested.some((optionId, index) => optionId !== existing[index])
  )
}

export type AttachedReservationOption = {
  optionId?: string | null
  optionName?: string | null
  optionPrice?: number | null
  storeShare?: number | null
  castShare?: number | null
  option?: { id?: string | null; name?: string | null; price?: number | null } | null
}

export type ReservationOptionRecord = {
  id: string
  name: string
  price: number
  storeShare: number | null
  castShare: number | null
}

export function attachedOptionIds(attached: readonly AttachedReservationOption[]): string[] {
  return attached
    .map((option) => option.optionId ?? option.option?.id)
    .filter((optionId): optionId is string => typeof optionId === 'string')
}

export function mergeAttachedOptionRecords(
  catalog: readonly ReservationOptionRecord[],
  attached: readonly AttachedReservationOption[]
): Map<string, ReservationOptionRecord> {
  const optionRecordMap = new Map(
    catalog.map((record) => [
      record.id,
      {
        id: record.id,
        name: record.name,
        price: record.price,
        storeShare: record.storeShare ?? null,
        castShare: record.castShare ?? null,
      },
    ])
  )
  for (const existing of attached) {
    if (!existing.optionId || optionRecordMap.has(existing.optionId)) {
      continue
    }
    optionRecordMap.set(existing.optionId, {
      id: existing.optionId,
      name: existing.optionName ?? existing.option?.name ?? existing.optionId,
      price: existing.optionPrice ?? existing.option?.price ?? 0,
      storeShare: existing.storeShare ?? null,
      castShare: existing.castShare ?? null,
    })
  }
  return optionRecordMap
}
