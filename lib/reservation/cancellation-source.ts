/**
 * @design_doc   Reservation cancellation-source update boundary
 * @related_to   app/api/reservation/route.ts and Prisma CancellationSource
 * @known_issues None currently
 */

export type CancellationSourceInput = 'customer' | 'store'

interface CancellationSourceUpdate {
  status?: unknown
  cancellationSource?: unknown
}

export type CancellationSourceUpdateResolution =
  | { ok: true; value: CancellationSourceInput | null | undefined }
  | { ok: false }

function isCancellationSourceInput(value: unknown): value is CancellationSourceInput {
  return value === 'customer' || value === 'store'
}

export function resolveCancellationSourceUpdate(
  update: CancellationSourceUpdate,
  defaultSource: CancellationSourceInput
): CancellationSourceUpdateResolution {
  const sourceSpecified = Object.prototype.hasOwnProperty.call(update, 'cancellationSource')
  const source = update.cancellationSource

  if (
    sourceSpecified &&
    !isCancellationSourceInput(source) &&
    (update.status === 'cancelled' || (source !== null && source !== undefined))
  ) {
    return { ok: false }
  }

  if (update.status === 'cancelled') {
    return {
      ok: true,
      value: isCancellationSourceInput(source) ? source : defaultSource,
    }
  }

  if (sourceSpecified || (Boolean(update.status) && update.status !== 'cancelled')) {
    return { ok: true, value: null }
  }

  return { ok: true, value: undefined }
}
