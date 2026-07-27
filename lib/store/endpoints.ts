/**
 * @design_doc   docs/LEGACY_DATA_MIGRATION_RUNBOOK.md store isolation requirement
 * @related_to   Store-scoped client API requests
 * @known_issues None
 */
export function buildStoreScopedEndpoint(endpoint: string, storeId: string): string {
  const normalizedStoreId = storeId.trim()

  if (!normalizedStoreId) {
    throw new Error('Store ID is required')
  }

  const separator = endpoint.includes('?') ? '&' : '?'

  return `${endpoint}${separator}storeId=${encodeURIComponent(normalizedStoreId)}`
}
