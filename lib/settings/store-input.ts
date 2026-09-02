/**
 * @design_doc   Notion task #281 store settings save error
 * @related_to   Store settings API validation
 * @known_issues None
 */
export function normalizeOptionalUrl(value: unknown): unknown {
  if (typeof value !== 'string') return value
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}
