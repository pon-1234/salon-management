/**
 * @design_doc   Multi-store reservation request routing
 * @related_to   Reservation API and admin booking components
 * @known_issues None
 */
export function buildStoreReservationEndpoint(storeId: string): string {
  const normalizedStoreId = storeId.trim()
  if (!normalizedStoreId) {
    throw new Error('Store ID is required')
  }

  return `/api/reservation?storeId=${encodeURIComponent(normalizedStoreId)}`
}

export function buildStoreCastEndpoint(storeId: string, castId: string): string {
  const normalizedStoreId = storeId.trim()
  if (!normalizedStoreId) {
    throw new Error('Store ID is required')
  }

  const normalizedCastId = castId.trim()
  if (!normalizedCastId) {
    throw new Error('Cast ID is required')
  }

  return `/api/cast?id=${encodeURIComponent(normalizedCastId)}&storeId=${encodeURIComponent(normalizedStoreId)}`
}
